import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { smallPhoto } from './photo-fixtures';

vi.mock('server-only', () => ({}));

describe.skipIf(process.env.RUN_GIFT_DATABASE_TESTS !== '1')('presentes no PostgreSQL exclusivo da C-009A', () => {
  let db: PrismaClient;
  let gifts: typeof import('../src/lib/gifts');

  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL ?? '');
    if (url.hostname !== '127.0.0.1' || url.port !== '55444' || url.pathname !== '/wedding_c009a_test') {
      throw new Error('Use exclusivamente o banco descartável wedding_c009a_test em 127.0.0.1:55444.');
    }
    process.env.DATABASE_URL = url.toString();
    process.env.PHOTO_STORAGE_DIR = `${process.cwd()}\\.tmp\\c009a-test-media`;
    ({ prisma: db } = await import('../src/lib/db'));
    gifts = await import('../src/lib/gifts');
  });

  it('autoriza só o dono, registra alterações, valida valor e arquiva sem apagar histórico', async () => {
    const token = randomUUID();
    const owner = await db.user.create({ data: { email: `gift-owner-${token}@example.test`, name: 'Noivos', passwordHash: 'test' } });
    const other = await db.user.create({ data: { email: `gift-other-${token}@example.test`, name: 'Outro', passwordHash: 'test' } });
    const wedding = await db.wedding.create({ data: { ownerId: owner.id, slug: `gift-${token}`, draft: {} } });
    const input = { name: 'Cafeteira', description: 'Para nossas manhãs', amount: '120,50' };
    await expect(gifts.createGift(other.id, wedding.id, 1, input)).rejects.toMatchObject({ code: 'not-found' });
    await expect(gifts.createGift(owner.id, wedding.id, 1, { ...input, amount: '-5' })).rejects.toMatchObject({ code: 'invalid' });
    const gift = await gifts.createGift(owner.id, wedding.id, 1, input);
    expect(gift.valueCents).toBe(12050);
    await expect(gifts.updateGift(other.id, wedding.id, 2, gift.id, { ...input, position: '1', active: 'false' })).rejects.toMatchObject({ code: 'not-found' });
    await expect(gifts.updateGift(owner.id, wedding.id, 1, gift.id, { ...input, position: '1', active: 'false' })).rejects.toMatchObject({ code: 'conflict' });
    const edited = await gifts.updateGift(owner.id, wedding.id, 2, gift.id, { ...input, amount: '99,90', name: 'Café', position: '2', active: 'false' });
    expect(edited).toMatchObject({ name: 'Café', valueCents: 9990, active: false, position: 2 });
    await gifts.archiveGift(owner.id, wedding.id, 3, gift.id);
    expect(await gifts.listOwnedGifts(owner.id, wedding.id)).toEqual([]);
    expect((await db.giftItem.findUniqueOrThrow({ where: { id: gift.id } })).archivedAt).not.toBeNull();
    expect(await db.giftAudit.count({ where: { weddingId: wedding.id, giftId: gift.id } })).toBe(3);
    await expect(gifts.listOwnedGifts(other.id, wedding.id)).rejects.toMatchObject({ code: 'not-found' });
  });

  it('publica somente presentes ativos e preserva o snapshot e o acesso à imagem até republicar ou despublicar', async () => {
    const weddings = await import('../src/lib/weddings');
    const { initialContent } = await import('../src/lib/content');
    const token = randomUUID();
    const owner = await db.user.create({ data: { email: `gift-public-${token}@example.test`, name: 'Noivos', passwordHash: 'test' } });
    const other = await db.user.create({ data: { email: `gift-private-${token}@example.test`, name: 'Outro', passwordHash: 'test' } });
    const wedding = await db.wedding.create({ data: { ownerId: owner.id, slug: `gift-public-${token}`, draft: { ...initialContent, coupleNames: 'Ana e Bia' } } });
    const gift = await gifts.createGift(owner.id, wedding.id, 1, { name: 'Lua de mel', description: 'Uma viagem', amount: '250,00' });
    await gifts.uploadGiftImage(owner.id, wedding.id, 2, gift.id, new Uint8Array(await smallPhoto('png')));
    const imageId = (await db.giftItem.findUniqueOrThrow({ where: { id: gift.id } })).imageId!;
    expect(await weddings.publicPage(wedding.slug)).toBeNull();
    expect(await gifts.accessibleGiftImage(imageId, null)).toBeNull();
    expect(await gifts.accessibleGiftImage(imageId, other.id)).toBeNull();
    expect(await gifts.accessibleGiftImage(imageId, owner.id)).not.toBeNull();
    await weddings.publishDraft(owner.id, wedding.id, 3);
    const published = await weddings.publicPage(wedding.slug);
    expect(published?.gifts).toEqual([{ id: gift.id, name: 'Lua de mel', description: 'Uma viagem', valueCents: 25000, imageId }]);
    expect(await gifts.accessibleGiftImage(imageId, null)).not.toBeNull();
    await gifts.updateGift(owner.id, wedding.id, 3, gift.id, { name: 'Nova viagem', description: '', amount: '300,00', position: '0', active: 'false' });
    expect((await weddings.publicPage(wedding.slug))?.gifts).toEqual(published?.gifts);
    expect(await gifts.accessibleGiftImage(imageId, null)).not.toBeNull();
    await weddings.publishDraft(owner.id, wedding.id, 4);
    expect((await weddings.publicPage(wedding.slug))?.gifts).toEqual([]);
    expect(await gifts.accessibleGiftImage(imageId, null)).toBeNull();
    await weddings.unpublish(owner.id, wedding.id, 4);
    expect(await weddings.publicPage(wedding.slug)).toBeNull();
  });

  it('impede imagem de outro casamento e serializa edição concorrente com a publicação', async () => {
    const weddings = await import('../src/lib/weddings');
    const { initialContent } = await import('../src/lib/content');
    const token = randomUUID();
    const owner = await db.user.create({ data: { email: `gift-race-${token}@example.test`, name: 'Casal', passwordHash: 'test' } });
    const other = await db.user.create({ data: { email: `gift-foreign-${token}@example.test`, name: 'Outro', passwordHash: 'test' } });
    const wedding = await db.wedding.create({ data: { ownerId: owner.id, slug: `gift-race-${token}`, draft: { ...initialContent, coupleNames: 'Ana e Bia' } } });
    const foreign = await db.wedding.create({ data: { ownerId: other.id, slug: `gift-foreign-${token}`, draft: { ...initialContent, coupleNames: 'Cris e Dani' } } });
    const gift = await gifts.createGift(owner.id, wedding.id, 1, { name: 'Antes', description: '', amount: '10,00' });
    const imageId = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    await db.giftImage.create({ data: { id: imageId, weddingId: foreign.id, mimeType: 'image/png', sizeBytes: 1, storageKey: imageId } });
    await expect(db.giftItem.update({ where: { id: gift.id }, data: { imageId } })).rejects.toThrow();
    const results = await Promise.allSettled([
      weddings.publishDraft(owner.id, wedding.id, 2),
      gifts.updateGift(owner.id, wedding.id, 2, gift.id, { name: 'Depois', description: '', amount: '20,00', position: '0', active: 'true' }),
    ]);
    expect(results[1].status).toBe('fulfilled');
    const published = await weddings.publicPage(wedding.slug);
    if (results[0].status === 'fulfilled') {
      expect(published?.gifts[0]).toMatchObject({ name: 'Antes', valueCents: 1000 });
    } else {
      expect(results[0].reason).toMatchObject({ code: 'conflict' });
      expect(published).toBeNull();
    }
  });
});
