import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  photo: vi.fn(), giftImage: vi.fn(), wedding: vi.fn(), publication: vi.fn(), read: vi.fn(), session: vi.fn(),
  headers: vi.fn(), cookies: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: mocks.headers, cookies: mocks.cookies }));
vi.mock('@/lib/photo-storage', () => ({ photoStorage: { read: mocks.read, write: vi.fn() } }));
vi.mock('@/lib/db', () => ({ prisma: {
  photo: { findUnique: mocks.photo }, giftImage: { findUnique: mocks.giftImage },
  wedding: { findUnique: mocks.wedding }, publication: { findFirst: mocks.publication },
  session: { findUnique: mocks.session },
  $transaction: async (callback: (tx: unknown) => unknown) => callback({ wedding: { findUnique: mocks.wedding }, publication: { findFirst: mocks.publication } }),
} }));
import { accessiblePhoto } from '../src/lib/photos';
import { accessibleGiftImage } from '../src/lib/gifts';
import { publicPage } from '../src/lib/weddings';
import { getUser } from '../src/lib/auth';

const secret = 'SYNTHETIC-test-password-0123456789';
const basic = `Basic ${Buffer.from(`viewer:${secret}`).toString('base64')}`;
const id = 'a'.repeat(64);
function configure() {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
  vi.stubEnv('NOIVARA_HOMOLOGACAO', '1');
  vi.stubEnv('NOIVARA_HOMOLOG_USUARIO', 'viewer');
  vi.stubEnv('NOIVARA_HOMOLOG_SENHA', secret);
  vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', 'demo_account');
}

describe('isolamento do banco de homologação', () => {
  beforeEach(() => { vi.resetAllMocks(); configure(); });
  afterEach(() => vi.unstubAllEnvs());

  it('não consulta a revisão publicada de outra conta', async () => {
    mocks.wedding.mockResolvedValue({ id: 'wedding', ownerId: 'other_account', publishedRevisionId: 'publication' });
    expect(await publicPage('other')).toBeNull();
    expect(mocks.publication).not.toHaveBeenCalled();
  });

  it('não lê do disco fotos e imagens de presentes de outra conta, mesmo publicadas', async () => {
    const record = { storageKey: id, weddingId: 'wedding', mimeType: 'image/jpeg',
      wedding: { ownerId: 'other_account', publishedRevision: { weddingId: 'wedding', content: {}, gifts: [] } } };
    mocks.photo.mockResolvedValue(record); mocks.giftImage.mockResolvedValue(record);
    expect(await accessiblePhoto(id, null)).toBeNull();
    expect(await accessibleGiftImage(id, null)).toBeNull();
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('não aceita sessão pré-existente de outra conta após ativar a homologação', async () => {
    mocks.headers.mockResolvedValue(new Headers({ authorization: basic }));
    mocks.cookies.mockResolvedValue({ get: () => ({ value: 'a'.repeat(64) }) });
    mocks.session.mockResolvedValue({ expiresAt: new Date(Date.now() + 10000), user: { id: 'other_account', name: 'Other', email: 'other@example.test' } });
    expect(await getUser()).toBeNull();
    mocks.session.mockResolvedValue({ expiresAt: new Date(Date.now() + 10000), user: { id: 'demo_account', name: 'Demo', email: 'demo@example.test' } });
    expect((await getUser())?.id).toBe('demo_account');
  });

  it('recusa ausência de sessão mesmo com acesso ao perímetro', async () => {
    mocks.headers.mockResolvedValue(new Headers({ authorization: basic }));
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    expect(await getUser()).toBeNull();
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it('recusa uma sessão expirada da própria conta de demonstração', async () => {
    mocks.headers.mockResolvedValue(new Headers({ authorization: basic }));
    mocks.cookies.mockResolvedValue({ get: () => ({ value: 'a'.repeat(64) }) });
    mocks.session.mockResolvedValue({ expiresAt: new Date(Date.now() - 10000), user: { id: 'demo_account', name: 'Demo', email: 'demo@example.test' } });
    expect(await getUser()).toBeNull();
    expect(mocks.session).toHaveBeenCalledOnce();
  });
});
