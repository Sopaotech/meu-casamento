import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), accessiblePhoto: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/photos', () => ({ accessiblePhoto: mocks.accessiblePhoto }));
import { GET } from '../src/app/fotos/[id]/route';

describe('resposta de fotografia', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retorna bytes autorizados com tipo seguro e sem cache', async () => {
    mocks.getUser.mockResolvedValue({ id: 'owner' });
    mocks.accessiblePhoto.mockResolvedValue({ bytes: Buffer.from([1, 2, 3]), mimeType: 'image/png' });
    const response = await GET(new Request('http://localhost/fotos/id'), { params: Promise.resolve({ id: 'id' }) });
    expect(mocks.accessiblePhoto).toHaveBeenCalledWith('id', 'owner');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([1, 2, 3]));
  });

  it('oculta fotos não autorizadas e também impede cache da resposta 404', async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.accessiblePhoto.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/fotos/id'), { params: Promise.resolve({ id: 'id' }) });
    expect(mocks.accessiblePhoto).toHaveBeenCalledWith('id', null);
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('não expõe o erro de armazenamento ou caminhos internos', async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.accessiblePhoto.mockRejectedValue(new Error('private server path'));
    const response = await GET(new Request('http://localhost/fotos/id'), { params: Promise.resolve({ id: 'id' }) });
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
