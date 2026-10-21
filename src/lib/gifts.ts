import 'server-only';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma as db } from '@/lib/db';
import { MAX_GIFTS, validateGiftFields, validatePublicGifts } from '@/lib/gift-content';
import { MAX_PHOTO_BYTES, processPhoto } from '@/lib/photos';
import { photoStorage } from '@/lib/photo-storage';
import { homologationAllowsOwner } from '@/lib/homologation';

type ErrorCode = 'not-found' | 'conflict' | 'invalid' | 'limit' | 'storage-error';
export class GiftError extends Error {
  constructor(public code: ErrorCode) { super(code); }
}

type Tx = Prisma.TransactionClient;

/** Lock the owner-scoped wedding and invalidate any stale site or gift edit. */
async function lockWedding(tx: Tx, ownerId: string, weddingId: string, version: number) {
  if (!Number.isInteger(version) || version < 0 || version >= 2147483647) throw new GiftError('invalid');
  const result = await tx.wedding.updateMany({
    where: { id: weddingId, ownerId, draftVersion: version },
    data: { draftVersion: { increment: 1 } },
  });
  if (result.count !== 1) {
    const exists = await tx.wedding.findFirst({ where: { id: weddingId, ownerId }, select: { id: true } });
    throw new GiftError(exists ? 'conflict' : 'not-found');
  }
}

async function audit(tx: Tx, item: { id: string; weddingId: string; name: string; description: string; valueCents: number | null; imageId: string | null; position: number; active: boolean; archivedAt: Date | null }, action: string) {
  const { id, weddingId, name, description, valueCents, imageId, position, active, archivedAt } = item;
  await tx.giftAudit.create({ data: { giftId: id, weddingId, action, snapshot: { name, description, valueCents, imageId, position, active, archived: Boolean(archivedAt) } } });
}

export async function listOwnedGifts(ownerId: string, weddingId: string) {
  const wedding = await db.wedding.findFirst({ where: { id: weddingId, ownerId }, select: { id: true } });
  if (!wedding) throw new GiftError('not-found');
  return db.giftItem.findMany({ where: { weddingId, archivedAt: null, wedding: { ownerId } }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
}

export async function createGift(ownerId: string, weddingId: string, version: number, input: { name: unknown; description: unknown; amount: unknown }) {
  const fields = validateGiftFields(input.name, input.description, input.amount);
  if (!fields) throw new GiftError('invalid');
  return db.$transaction(async tx => {
    await lockWedding(tx, ownerId, weddingId, version);
    if (await tx.giftItem.count({ where: { weddingId, archivedAt: null } }) >= MAX_GIFTS) throw new GiftError('limit');
    const last = await tx.giftItem.findFirst({ where: { weddingId, archivedAt: null }, orderBy: { position: 'desc' }, select: { position: true } });
    const item = await tx.giftItem.create({ data: { ...fields, weddingId, position: Math.min((last?.position ?? -1) + 1, 1_000_000) } });
    await audit(tx, item, 'created');
    return item;
  });
}

export async function updateGift(ownerId: string, weddingId: string, version: number, giftId: string, input: { name: unknown; description: unknown; amount: unknown; position: unknown; active: unknown }) {
  const fields = validateGiftFields(input.name, input.description, input.amount);
  const position = typeof input.position === 'string' && /^\d{1,7}$/.test(input.position) ? Number(input.position) : -1;
  if (!fields || position < 0 || position > 1_000_000 || (input.active !== 'true' && input.active !== 'false')) throw new GiftError('invalid');
  return db.$transaction(async tx => {
    await lockWedding(tx, ownerId, weddingId, version);
    const updated = await tx.giftItem.updateMany({ where: { id: giftId, weddingId, archivedAt: null }, data: { ...fields, position, active: input.active === 'true' } });
    if (!updated.count) throw new GiftError('not-found');
    const item = await tx.giftItem.findFirstOrThrow({ where: { id: giftId, weddingId } });
    await audit(tx, item, 'updated');
    return item;
  });
}

export async function archiveGift(ownerId: string, weddingId: string, version: number, giftId: string) {
  return db.$transaction(async tx => {
    await lockWedding(tx, ownerId, weddingId, version);
    const updated = await tx.giftItem.updateMany({ where: { id: giftId, weddingId, archivedAt: null }, data: { active: false, archivedAt: new Date() } });
    if (!updated.count) throw new GiftError('not-found');
    const item = await tx.giftItem.findFirstOrThrow({ where: { id: giftId, weddingId } });
    await audit(tx, item, 'archived');
  });
}

export async function uploadGiftImage(ownerId: string, weddingId: string, version: number, giftId: string, bytes: Uint8Array) {
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new GiftError('invalid');
  if (!await db.wedding.findFirst({ where: { id: weddingId, ownerId }, select: { id: true } })) throw new GiftError('not-found');
  const processed = await processPhoto(bytes);
  const id = randomBytes(32).toString('hex');
  await db.$transaction(async tx => {
    await lockWedding(tx, ownerId, weddingId, version);
    if (!await tx.giftItem.findFirst({ where: { id: giftId, weddingId, archivedAt: null }, select: { id: true } })) throw new GiftError('not-found');
    // Retained revisions may reference old images. Never delete them automatically.
    if (await tx.giftImage.count({ where: { weddingId } }) >= 200) throw new GiftError('limit');
    try { await photoStorage.write(id, processed.bytes); } catch { throw new GiftError('storage-error'); }
    await tx.giftImage.create({ data: { id, weddingId, storageKey: id, mimeType: processed.mimeType, sizeBytes: processed.bytes.length } });
    const item = await tx.giftItem.update({ where: { id: giftId }, data: { imageId: id } });
    await audit(tx, item, 'image-changed');
  });
}

/** Public access is granted only by the active snapshot of the same wedding. */
export async function accessibleGiftImage(id: string, userId: string | null) {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const image = await db.giftImage.findUnique({ where: { id }, select: {
    storageKey: true, mimeType: true, weddingId: true,
    wedding: { select: { ownerId: true, publishedRevision: { select: { weddingId: true, gifts: true } } } },
  } });
  if (!image || !homologationAllowsOwner(image.wedding.ownerId)) return null;
  if (!userId || image.wedding.ownerId !== userId) {
    const revision = image.wedding.publishedRevision;
    if (!revision || revision.weddingId !== image.weddingId) return null;
    const gifts = validatePublicGifts(revision.gifts);
    if (!gifts?.some(gift => gift.imageId === id)) return null;
  }
  try { return { bytes: await photoStorage.read(image.storageKey), mimeType: image.mimeType }; }
  catch { throw new GiftError('storage-error'); }
}
