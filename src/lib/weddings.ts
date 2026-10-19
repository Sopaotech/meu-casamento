import 'server-only';
import { prisma as db } from '@/lib/db';
import { initialContent, type WeddingContent } from '@/lib/content';

export class WeddingError extends Error {
  constructor(public code: 'not-found' | 'conflict' | 'slug-taken') { super(code); }
}

export async function listWeddings(ownerId: string) {
  return db.wedding.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, select: {
    id: true, slug: true, draft: true, publishedRevisionId: true,
  } });
}

export async function ownedWedding(ownerId: string, id: string) {
  return db.wedding.findFirst({ where: { id, ownerId }, select: {
    id: true, slug: true, draft: true, draftVersion: true, publishedRevisionId: true,
  } });
}

export async function createWedding(ownerId: string, slug: string, coupleNames: string) {
  try {
    return await db.wedding.create({ data: {
      ownerId, slug, draft: { ...initialContent, coupleNames },
    }, select: { id: true } });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new WeddingError('slug-taken');
    }
    throw error;
  }
}

/** The owner check and version check are part of the write, not a preceding lookup. */
export async function saveDraft(ownerId: string, id: string, expectedVersion: number, content: WeddingContent) {
  await db.$transaction(async (tx) => {
    const wedding = await tx.wedding.findFirst({ where: { id, ownerId }, select: { draft: true, draftVersion: true } });
    if (!wedding) throw new WeddingError('not-found');
    if (wedding.draftVersion !== expectedVersion) throw new WeddingError('conflict');
    const { validateContent } = await import('@/lib/content');
    const existing = validateContent(wedding.draft);
    const incoming = validateContent(content);
    if (!existing.ok || !incoming.ok || existing.content.photoIds.length !== incoming.content.photoIds.length
      || existing.content.photoIds.some((photoId, index) => photoId !== incoming.content.photoIds[index])) {
      throw new WeddingError('conflict');
    }
    const result = await tx.wedding.updateMany({
      where: { id, ownerId, draftVersion: expectedVersion },
      data: { draft: incoming.content, draftVersion: { increment: 1 } },
    });
    if (result.count !== 1) throw new WeddingError('conflict');
  });
}

/** A conditional write protects against a draft changing while it is being published. */
export async function publishDraft(ownerId: string, id: string, expectedVersion: number) {
  await db.$transaction(async (tx) => {
    const wedding = await tx.wedding.findFirst({ where: { id, ownerId }, select: { id: true, draft: true, draftVersion: true } });
    if (!wedding) throw new WeddingError('not-found');
    if (wedding.draftVersion !== expectedVersion) throw new WeddingError('conflict');
    const { validateContent } = await import('@/lib/content');
    const validated = validateContent(wedding.draft);
    if (!validated.ok) throw new WeddingError('conflict');
    if (validated.content.photoIds.length && await tx.photo.count({
      where: { weddingId: id, id: { in: validated.content.photoIds } },
    }) !== validated.content.photoIds.length) throw new WeddingError('conflict');
    const revision = await tx.publication.create({ data: { weddingId: id, content: validated.content }, select: { id: true } });
    const updated = await tx.wedding.updateMany({
      where: { id, ownerId, draftVersion: expectedVersion }, data: { publishedRevisionId: revision.id },
    });
    if (updated.count !== 1) throw new WeddingError('conflict');
  });
}

export async function unpublish(ownerId: string, id: string, expectedVersion: number) {
  // Incrementing the version also prevents an in-flight publish from undoing this action.
  const updated = await db.wedding.updateMany({
    where: { id, ownerId, draftVersion: expectedVersion },
    data: { publishedRevisionId: null, draftVersion: { increment: 1 } },
  });
  if (updated.count !== 1) {
    if (!await ownedWedding(ownerId, id)) throw new WeddingError('not-found');
    throw new WeddingError('conflict');
  }
}

/** Explicitly check revision ownership even if data was corrupted by external code. */
export async function publicContent(slug: string) {
  const site = await db.wedding.findUnique({ where: { slug }, select: { id: true, publishedRevisionId: true } });
  if (!site?.publishedRevisionId) return null;
  const revision = await db.publication.findFirst({ where: { id: site.publishedRevisionId, weddingId: site.id }, select: { content: true } });
  if (!revision) return null;
  const { validateContent } = await import('@/lib/content');
  const result = validateContent(revision.content);
  return result.ok ? result.content : null;
}
