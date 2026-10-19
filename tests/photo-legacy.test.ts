import { beforeEach, describe, expect, it, vi } from 'vitest';
import { smallPhoto } from './photo-fixtures';

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { photo: { findUnique: mocks.findUnique, updateMany: mocks.updateMany } } }));
vi.mock('@/lib/photo-storage', () => ({ photoStorage: { read: mocks.read, write: mocks.write } }));
import { accessiblePhoto } from '../src/lib/photos';

describe('preservação de fotos legadas', () => {
  const id = 'a'.repeat(64);
  const photo = { storageKey: null, mimeType: 'image/png', weddingId: 'site', wedding: { ownerId: 'owner', publishedRevision: null } };
  beforeEach(() => vi.resetAllMocks());

  it('não consulta bytes legados nem grava disco para uma conta diferente', async () => {
    mocks.findUnique.mockResolvedValueOnce(photo);
    expect(await accessiblePhoto(id, 'other')).toBeNull();
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it('só remove os bytes antigos após a gravação bem-sucedida', async () => {
    const input = await smallPhoto('png');
    mocks.findUnique.mockResolvedValueOnce(photo).mockResolvedValueOnce({ bytes: input, storageKey: null });
    mocks.write.mockResolvedValue(undefined);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    const result = await accessiblePhoto(id, 'owner');
    expect(result?.mimeType).toBe('image/png');
    expect(mocks.write).toHaveBeenCalledWith(id, result?.bytes);
    expect(mocks.write.mock.invocationCallOrder[0]).toBeLessThan(mocks.updateMany.mock.invocationCallOrder[0]);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ bytes: null, storageKey: id }) }));
  });

  it('mantém os bytes antigos em falha de gravação', async () => {
    const input = await smallPhoto('png');
    mocks.findUnique.mockResolvedValueOnce(photo).mockResolvedValueOnce({ bytes: input, storageKey: null });
    mocks.write.mockRejectedValue(new Error('disk unavailable'));
    await expect(accessiblePhoto(id, 'owner')).rejects.toMatchObject({ code: 'storage-error' });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
