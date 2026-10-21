import 'server-only';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { prisma as db } from '@/lib/db';
import { validateContent } from '@/lib/content';
import { photoStorage } from '@/lib/photo-storage';
import { homologationAllowsOwner } from '@/lib/homologation';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTO_PIXELS = 20_000_000;
export const MAX_DRAFT_PHOTOS = 20;
// Bound the union of the draft and all retained publication references.
export const MAX_STORED_PHOTOS = 100;

type PhotoErrorCode = 'not-found' | 'conflict' | 'invalid-format' | 'too-large' | 'draft-limit' | 'storage-limit' | 'storage-error';
export class PhotoError extends Error {
  constructor(public code: PhotoErrorCode) { super(code); }
}

/** Do not trust a filename or a client-supplied Content-Type. */
export function photoMimeType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'image/png';
  if (bytes.length >= 12 && [0x52, 0x49, 0x46, 0x46].every((b, i) => bytes[i] === b)
    && [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[i + 8] === b)) return 'image/webp';
  return null;
}

// libvips may decode only the first frame of APNG. Reject its animation control
// chunk explicitly, including when the local decoder lacks animation support.
function hasPngAnimation(bytes: Uint8Array): boolean {
  const data = Buffer.from(bytes);
  let offset = 8;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    if (length > data.length - offset - 12) return false; // decoder rejects truncation
    if (data.toString('ascii', offset + 4, offset + 8) === 'acTL') return true;
    offset += length + 12;
  }
  return false;
}

/** Decode and re-encode without metadata, applying EXIF orientation to pixels. */
export async function processPhoto(bytes: Uint8Array): Promise<{ mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; bytes: Buffer }> {
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new PhotoError('too-large');
  const mimeType = photoMimeType(bytes);
  if (!mimeType) throw new PhotoError('invalid-format');
  try {
    if (mimeType === 'image/png' && hasPngAnimation(bytes)) throw new PhotoError('invalid-format');
    const image = sharp(Buffer.from(bytes), { failOn: 'warning', limitInputPixels: MAX_PHOTO_PIXELS });
    const metadata = await image.metadata();
    const expectedFormat = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType];
    if (metadata.format !== expectedFormat || !metadata.width || !metadata.height
      || metadata.width * metadata.height > MAX_PHOTO_PIXELS || (metadata.pages ?? 1) !== 1) {
      throw new PhotoError('invalid-format');
    }
    // Re-encoding fully decodes the pixels. Sharp strips metadata by default.
    const result = await image.rotate().toFormat(expectedFormat as 'jpeg' | 'png' | 'webp').toBuffer();
    if (result.byteLength > MAX_PHOTO_BYTES) throw new PhotoError('too-large');
    return { mimeType, bytes: result };
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    // Do not expose native decoder errors or submitted data to the user.
    throw new PhotoError('invalid-format');
  }
}

export async function validatePhoto(bytes: Uint8Array): Promise<'image/jpeg' | 'image/png' | 'image/webp'> {
  return (await processPhoto(bytes)).mimeType;
}

export async function uploadPhoto(ownerId: string, weddingId: string, expectedVersion: number, bytes: Uint8Array): Promise<void> {
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new PhotoError('too-large');
  const processed = await processPhoto(bytes);
  const id = randomBytes(32).toString('hex');
  await db.$transaction(async (tx) => {
    const wedding = await tx.wedding.findFirst({ where: { id: weddingId, ownerId }, select: { draft: true, draftVersion: true } });
    if (!wedding) throw new PhotoError('not-found');
    if (wedding.draftVersion !== expectedVersion) throw new PhotoError('conflict');
    const validated = validateContent(wedding.draft);
    if (!validated.ok) throw new PhotoError('conflict');
    if (validated.content.photoIds.length >= MAX_DRAFT_PHOTOS) throw new PhotoError('draft-limit');
    const protectedIds = new Set(validated.content.photoIds);
    const revisions = await tx.publication.findMany({ where: { weddingId }, select: { content: true } });
    for (const revision of revisions) {
      const content = validateContent(revision.content);
      // If a retained revision is corrupt, do not guess which photos it protects.
      if (!content.ok) throw new PhotoError('conflict');
      for (const photoId of content.content.photoIds) protectedIds.add(photoId);
    }
    if (protectedIds.size >= MAX_STORED_PHOTOS) throw new PhotoError('storage-limit');
    // This write serializes competing edits and makes both the photo and draft atomic.
    const result = await tx.wedding.updateMany({
      where: { id: weddingId, ownerId, draftVersion: expectedVersion },
      data: { draft: { ...validated.content, photoIds: [...validated.content.photoIds, id] }, draftVersion: { increment: 1 } },
    });
    if (result.count !== 1) throw new PhotoError('conflict');
    try {
      await photoStorage.write(id, processed.bytes);
    } catch {
      throw new PhotoError('storage-error');
    }
    // An interrupted transaction can leave an orphan file; it is never deleted
    // automatically because a commit outcome may be uncertain.
    await tx.photo.create({ data: { id, weddingId, mimeType: processed.mimeType, storageKey: id, sizeBytes: processed.bytes.length } });
  });
}

export async function removePhoto(ownerId: string, weddingId: string, expectedVersion: number, photoId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const wedding = await tx.wedding.findFirst({ where: { id: weddingId, ownerId }, select: { draft: true, draftVersion: true } });
    if (!wedding) throw new PhotoError('not-found');
    if (wedding.draftVersion !== expectedVersion) throw new PhotoError('conflict');
    const validated = validateContent(wedding.draft);
    if (!validated.ok) throw new PhotoError('conflict');
    if (!validated.content.photoIds.includes(photoId)) throw new PhotoError('not-found');
    const result = await tx.wedding.updateMany({
      where: { id: weddingId, ownerId, draftVersion: expectedVersion },
      data: { draft: { ...validated.content, photoIds: validated.content.photoIds.filter((id) => id !== photoId) }, draftVersion: { increment: 1 } },
    });
    if (result.count !== 1) throw new PhotoError('conflict');
  });
}

/** Only the owner or the active, same-wedding publication grants access. */
export async function accessiblePhoto(id: string, userId: string | null) {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const photo = await db.photo.findUnique({ where: { id }, select: {
    storageKey: true, mimeType: true, weddingId: true,
    wedding: { select: { ownerId: true, publishedRevision: { select: { weddingId: true, content: true } } } },
  } });
  if (!photo || !homologationAllowsOwner(photo.wedding.ownerId)) return null;
  if (!userId || photo.wedding.ownerId !== userId) {
    const revision = photo.wedding.publishedRevision;
    if (!revision || revision.weddingId !== photo.weddingId) return null;
    const validated = validateContent(revision.content);
    if (!validated.ok || !validated.content.photoIds.includes(id)) return null;
  }
  try {
    if (photo.storageKey) return { bytes: await photoStorage.read(photo.storageKey), mimeType: photo.mimeType };
    // Legacy data is moved only after authorization and removed from PostgreSQL
    // only after a successful disk write. Retries are safe after interruption.
    const legacy = await db.photo.findUnique({ where: { id }, select: { bytes: true, storageKey: true } });
    if (!legacy) return null;
    if (legacy.storageKey) return { bytes: await photoStorage.read(legacy.storageKey), mimeType: photo.mimeType };
    if (!legacy.bytes) throw new Error('Missing photo');
    const processed = await processPhoto(legacy.bytes);
    try {
      await photoStorage.write(id, processed.bytes);
    } catch (error) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'EEXIST'
        || !(await photoStorage.read(id)).equals(processed.bytes)) throw error;
    }
    await db.photo.updateMany({ where: { id, storageKey: null }, data: {
      storageKey: id, sizeBytes: processed.bytes.length, mimeType: processed.mimeType, bytes: null,
    } });
    return { bytes: processed.bytes, mimeType: processed.mimeType };
  } catch {
    throw new PhotoError('storage-error');
  }
}
