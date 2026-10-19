import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rmdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { smallPhoto } from './photo-fixtures';

// Next resolves this marker for server code. It has no runtime behavior in tests.
vi.mock('server-only', () => ({}));

const enabled = process.env.RUN_DATABASE_TESTS === '1';

describe.skipIf(!enabled)('isolamento e publicação no PostgreSQL', () => {
  let db: PrismaClient;
  let weddings: typeof import('../src/lib/weddings');
  const users: string[] = [];
  const weddingIds: string[] = [];
  const originalUrl = process.env.DATABASE_URL;
  const originalStorageDir = process.env.PHOTO_STORAGE_DIR;
  let storageDir: string;

  beforeAll(async () => {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) throw new Error('Defina TEST_DATABASE_URL para um banco de teste separado.');
    let parsed: URL;
    try { parsed = new URL(testUrl); } catch { throw new Error('TEST_DATABASE_URL inválida.'); }
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !/^\/[a-zA-Z0-9_-]+_test$/.test(parsed.pathname)) {
      throw new Error('TEST_DATABASE_URL deve apontar para um banco PostgreSQL com nome terminado em _test.');
    }
    process.env.DATABASE_URL = testUrl;
    await mkdir(path.join(process.cwd(), '.tmp'), { recursive: true });
    storageDir = await mkdtemp(path.join(process.cwd(), '.tmp', 'photo-integration-test-'));
    process.env.PHOTO_STORAGE_DIR = storageDir;
    ({ prisma: db } = await import('../src/lib/db'));
    weddings = await import('../src/lib/weddings');
    await db.$connect();
  });

  afterAll(async () => {
    if (db) {
      // Only records whose IDs this test created are touched. No truncate or database drop.
      if (weddingIds.length) {
        await db.wedding.updateMany({ where: { id: { in: weddingIds } }, data: { publishedRevisionId: null } });
        await db.publication.deleteMany({ where: { weddingId: { in: weddingIds } } });
        await db.photo.deleteMany({ where: { weddingId: { in: weddingIds } } });
        await db.wedding.deleteMany({ where: { id: { in: weddingIds } } });
      }
      if (users.length) await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalStorageDir === undefined) delete process.env.PHOTO_STORAGE_DIR;
    else process.env.PHOTO_STORAGE_DIR = originalStorageDir;
    if (storageDir) {
      for (const name of await readdir(storageDir)) {
        if (/^[a-f0-9]{64}$/.test(name)) await unlink(path.join(storageDir, name));
      }
      await rmdir(storageDir);
    }
  });

  it('nega acesso cruzado e só revela o snapshot publicado, inclusive após editar', async () => {
    const token = randomUUID();
    const owner = await db.user.create({ data: { email: `a-${token}@example.test`, name: 'A', passwordHash: 'test-only' }, select: { id: true } });
    users.push(owner.id);
    const other = await db.user.create({ data: { email: `b-${token}@example.test`, name: 'B', passwordHash: 'test-only' }, select: { id: true } });
    users.push(other.id);

    const slug = `teste-${token}`;
    const first = await weddings.createWedding(owner.id, slug, 'Ana e João');
    weddingIds.push(first.id);
    const otherWedding = await weddings.createWedding(other.id, `outro-${token}`, 'Bia e Caio');
    weddingIds.push(otherWedding.id);
    const initial = await weddings.ownedWedding(owner.id, first.id);
    expect(initial).not.toBeNull();
    expect(await weddings.ownedWedding(other.id, first.id)).toBeNull();
    expect(await weddings.publicContent(slug)).toBeNull();
    const content = { template: 'moderno' as const, templateVersion: 1 as const, coupleNames: 'Ana e João', eventDate: '', eventLocation: '', story: 'Primeira história', welcomeMessage: '', photoIds: [] as string[] };
    await expect(weddings.saveDraft(other.id, first.id, initial!.draftVersion, content)).rejects.toMatchObject({ code: 'not-found' });
    await expect(weddings.publishDraft(other.id, first.id, initial!.draftVersion)).rejects.toMatchObject({ code: 'not-found' });
    await expect(weddings.unpublish(other.id, first.id, initial!.draftVersion)).rejects.toMatchObject({ code: 'not-found' });
    await weddings.saveDraft(owner.id, first.id, initial!.draftVersion, content);
    const saved = (await weddings.ownedWedding(owner.id, first.id))!;
    await weddings.publishDraft(owner.id, first.id, saved.draftVersion);
    expect(await weddings.publicContent(slug)).toEqual(content);
    const edited = { ...content, story: 'Segunda história ainda privada' };
    await weddings.saveDraft(owner.id, first.id, saved.draftVersion, edited);
    expect(await weddings.publicContent(slug)).toEqual(content);
    await expect(weddings.publishDraft(owner.id, first.id, saved.draftVersion)).rejects.toMatchObject({ code: 'conflict' });
    const updated = (await weddings.ownedWedding(owner.id, first.id))!;
    await weddings.publishDraft(owner.id, first.id, updated.draftVersion);
    expect(await weddings.publicContent(slug)).toEqual(edited);

    const competing = await Promise.allSettled([
      weddings.saveDraft(owner.id, first.id, updated.draftVersion, { ...edited, story: 'Edição 1' }),
      weddings.saveDraft(owner.id, first.id, updated.draftVersion, { ...edited, story: 'Edição 2' }),
    ]);
    expect(competing.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(competing.filter((item) => item.status === 'rejected')).toHaveLength(1);
    expect(await weddings.publicContent(slug)).toEqual(edited);

    const otherState = (await weddings.ownedWedding(other.id, otherWedding.id))!;
    await weddings.publishDraft(other.id, otherWedding.id, otherState.draftVersion);
    const otherPublished = (await weddings.ownedWedding(other.id, otherWedding.id))!;
    // Clear its active pointer so a uniqueness violation cannot hide the FK check.
    await weddings.unpublish(other.id, otherWedding.id, otherPublished.draftVersion);
    // The composite foreign key also rejects attaching another tenant's snapshot.
    await expect(db.wedding.update({ where: { id: first.id }, data: { publishedRevisionId: otherPublished.publishedRevisionId } })).rejects.toThrow();

    const latest = (await weddings.ownedWedding(owner.id, first.id))!;
    await weddings.unpublish(owner.id, first.id, latest.draftVersion);
    expect(await weddings.publicContent(slug)).toBeNull();
    await expect(weddings.publishDraft(owner.id, first.id, latest.draftVersion)).rejects.toMatchObject({ code: 'conflict' });
  });

  it('isola fotos, protege versões e mantém o snapshot até despublicar ou republicar', async () => {
    const photos = await import('../src/lib/photos');
    const token = randomUUID();
    const owner = await db.user.create({ data: { email: `photos-a-${token}@example.test`, name: 'A', passwordHash: 'test-only' } });
    const other = await db.user.create({ data: { email: `photos-b-${token}@example.test`, name: 'B', passwordHash: 'test-only' } });
    users.push(owner.id, other.id);
    const site = await weddings.createWedding(owner.id, `fotos-${token}`, 'Ana e João');
    const otherSite = await weddings.createWedding(other.id, `outro-fotos-${token}`, 'Bia e Caio');
    weddingIds.push(site.id, otherSite.id);
    const png = new Uint8Array(await smallPhoto('png'));
    let state = (await weddings.ownedWedding(owner.id, site.id))!;
    await expect(photos.uploadPhoto(other.id, site.id, state.draftVersion, png)).rejects.toMatchObject({ code: 'not-found' });
    await photos.uploadPhoto(owner.id, site.id, state.draftVersion, png);
    await expect(photos.uploadPhoto(owner.id, site.id, state.draftVersion, png)).rejects.toMatchObject({ code: 'conflict' });
    state = (await weddings.ownedWedding(owner.id, site.id))!;
    const draft = state.draft as unknown as import('../src/lib/content').WeddingContent;
    const [photoId] = draft.photoIds;
    expect(photoId).toMatch(/^[a-f0-9]{64}$/);
    expect(await photos.accessiblePhoto(photoId, null)).toBeNull();
    expect(await photos.accessiblePhoto(photoId, other.id)).toBeNull();
    const diskPhoto = (await photos.accessiblePhoto(photoId, owner.id))!;
    expect(await readFile(path.join(storageDir, photoId))).toEqual(diskPhoto.bytes);
    const photoRecord = (await db.photo.findUnique({ where: { id: photoId } }))!;
    expect(photoRecord.storageKey).toBe(photoId);
    expect(photoRecord.sizeBytes).toBe(diskPhoto.bytes.length);
    expect(photoRecord.bytes).toBeNull();
    await expect(weddings.saveDraft(owner.id, site.id, state.draftVersion, { ...draft, photoIds: [] })).rejects.toMatchObject({ code: 'conflict' });
    await weddings.publishDraft(owner.id, site.id, state.draftVersion);
    expect((await photos.accessiblePhoto(photoId, null))?.mimeType).toBe('image/png');
    await expect(photos.removePhoto(other.id, site.id, state.draftVersion, photoId)).rejects.toMatchObject({ code: 'not-found' });
    await photos.removePhoto(owner.id, site.id, state.draftVersion, photoId);
    expect(await photos.accessiblePhoto(photoId, null)).not.toBeNull();
    expect((await weddings.publicContent(`fotos-${token}`))?.photoIds).toEqual([photoId]);
    state = (await weddings.ownedWedding(owner.id, site.id))!;
    await weddings.publishDraft(owner.id, site.id, state.draftVersion);
    expect(await photos.accessiblePhoto(photoId, null)).toBeNull();
    expect(await photos.accessiblePhoto(photoId, owner.id)).not.toBeNull();
    expect(await readFile(path.join(storageDir, photoId))).toEqual(diskPhoto.bytes);

    const { photoStorage } = await import('../src/lib/photo-storage');
    const write = vi.spyOn(photoStorage, 'write').mockRejectedValueOnce(new Error('disk unavailable'));
    await expect(photos.uploadPhoto(owner.id, site.id, state.draftVersion, png)).rejects.toMatchObject({ code: 'storage-error' });
    expect((await weddings.ownedWedding(owner.id, site.id))!.draftVersion).toBe(state.draftVersion);
    write.mockRestore();

    // Legacy bytes are migrated only after access has been authorized.
    const legacyId = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    await db.photo.create({ data: { id: legacyId, weddingId: site.id, mimeType: 'image/png', bytes: png } });
    expect(await photos.accessiblePhoto(legacyId, other.id)).toBeNull();
    expect((await db.photo.findUnique({ where: { id: legacyId } }))!.bytes).not.toBeNull();
    const legacyWrite = vi.spyOn(photoStorage, 'write').mockRejectedValueOnce(new Error('disk unavailable'));
    await expect(photos.accessiblePhoto(legacyId, owner.id)).rejects.toMatchObject({ code: 'storage-error' });
    expect((await db.photo.findUnique({ where: { id: legacyId } }))!.bytes).not.toBeNull();
    legacyWrite.mockRestore();
    const legacyPhoto = (await photos.accessiblePhoto(legacyId, owner.id))!;
    expect(await readFile(path.join(storageDir, legacyId))).toEqual(legacyPhoto.bytes);
    expect((await db.photo.findUnique({ where: { id: legacyId } }))!.bytes).toBeNull();

    // Database corruption or an attempted cross-wedding reference must not publish.
    const otherState = (await weddings.ownedWedding(other.id, otherSite.id))!;
    await photos.uploadPhoto(other.id, otherSite.id, otherState.draftVersion, png);
    const foreignDraft = (await weddings.ownedWedding(other.id, otherSite.id))!.draft as unknown as import('../src/lib/content').WeddingContent;
    await db.wedding.update({ where: { id: site.id }, data: { draft: { ...draft, photoIds: foreignDraft.photoIds } } });
    await expect(weddings.publishDraft(owner.id, site.id, state.draftVersion)).rejects.toMatchObject({ code: 'conflict' });
    await weddings.unpublish(owner.id, site.id, state.draftVersion);
    expect(await photos.accessiblePhoto(photoId, null)).toBeNull();
  });

  it('limita o rascunho e as referências protegidas, mas não candidatos à limpeza', async () => {
    const photos = await import('../src/lib/photos');
    const token = randomUUID();
    const owner = await db.user.create({ data: { email: `photo-limits-${token}@example.test`, name: 'A', passwordHash: 'test-only' } });
    users.push(owner.id);
    const site = await weddings.createWedding(owner.id, `limite-${token}`, 'Ana e João');
    weddingIds.push(site.id);
    const bytes = new Uint8Array(await smallPhoto('jpeg'));
    const ids = Array.from({ length: photos.MAX_STORED_PHOTOS }, () => randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''));
    await db.photo.createMany({ data: ids.map((id) => ({ id, weddingId: site.id, mimeType: 'image/jpeg', storageKey: id, sizeBytes: bytes.length })) });
    const state = (await weddings.ownedWedding(owner.id, site.id))!;
    const draft = state.draft as unknown as import('../src/lib/content').WeddingContent;
    await db.wedding.update({ where: { id: site.id }, data: { draft: { ...draft, photoIds: ids.slice(0, photos.MAX_DRAFT_PHOTOS) } } });
    await expect(photos.uploadPhoto(owner.id, site.id, state.draftVersion, bytes)).rejects.toMatchObject({ code: 'draft-limit' });
    await photos.removePhoto(owner.id, site.id, state.draftVersion, ids[0]);
    await photos.uploadPhoto(owner.id, site.id, state.draftVersion + 1, bytes);
    expect(await db.photo.count({ where: { weddingId: site.id } })).toBe(photos.MAX_STORED_PHOTOS + 1);
    const latest = (await weddings.ownedWedding(owner.id, site.id))!;
    const latestDraft = latest.draft as unknown as import('../src/lib/content').WeddingContent;
    // Five retained snapshots protect all 100 distinct original IDs.
    for (let i = 0; i < ids.length; i += photos.MAX_DRAFT_PHOTOS) {
      await db.publication.create({ data: { weddingId: site.id, content: { ...draft, photoIds: ids.slice(i, i + photos.MAX_DRAFT_PHOTOS) } } });
    }
    await photos.removePhoto(owner.id, site.id, latest.draftVersion, latestDraft.photoIds[0]);
    await expect(photos.uploadPhoto(owner.id, site.id, latest.draftVersion + 1, bytes)).rejects.toMatchObject({ code: 'storage-limit' });
  });
});
