import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ headers: vi.fn(), create: vi.fn(), requireUser: vi.fn(), createWedding: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NOT_FOUND'); },
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));
vi.mock('@/lib/db', () => ({ prisma: { user: { create: mocks.create } } }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser, createSession: vi.fn(), destroySession: vi.fn() }));
vi.mock('@/lib/weddings', () => ({ createWedding: mocks.createWedding, WeddingError: class extends Error {} }));
vi.mock('@/lib/photos', () => ({ PhotoError: class extends Error {} }));
import { signup } from '../src/app/cadastro/actions';
import { createWeddingAction } from '../src/app/painel/actions';

const secret = 'SYNTHETIC-test-password-0123456789';
const basic = `Basic ${Buffer.from(`${'a'.repeat(32)}:${secret}`).toString('base64')}`;
function configure() {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
  vi.stubEnv('NOIVARA_HOMOLOGACAO', '1');
  vi.stubEnv('NOIVARA_HOMOLOG_USUARIO', 'a'.repeat(32));
  vi.stubEnv('NOIVARA_HOMOLOG_SENHA', secret);
  vi.stubEnv('NOIVARA_HOMOLOG_USUARIO_2', 'b'.repeat(32));
  vi.stubEnv('NOIVARA_HOMOLOG_SENHA_2', 'SYNTHETIC-second-password-987654321');
  vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', 'demo_account');
}

describe('ações diretas na homologação', () => {
  beforeEach(() => { vi.resetAllMocks(); configure(); });
  afterEach(() => vi.unstubAllEnvs());

  it('recusa mutação sem credenciais de perímetro antes de autenticar ou gravar', async () => {
    mocks.headers.mockResolvedValue(new Headers({ origin: 'http://127.0.0.1:3000', 'x-middleware-next': '1' }));
    await expect(createWeddingAction(new FormData())).rejects.toThrow('Acesso de homologação negado');
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createWedding).not.toHaveBeenCalled();
  });

  it('bloqueia a ação direta de cadastro mesmo com credencial de perímetro', async () => {
    mocks.headers.mockResolvedValue(new Headers({ origin: 'http://127.0.0.1:3000', authorization: basic }));
    await expect(signup(new FormData())).rejects.toThrow('NOT_FOUND');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('mantém o caminho de cadastro normal com o modo e parâmetros ausentes', async () => {
    for (const name of ['NOIVARA_HOMOLOGACAO', 'NOIVARA_HOMOLOG_USUARIO', 'NOIVARA_HOMOLOG_SENHA', 'NOIVARA_HOMOLOG_USUARIO_2', 'NOIVARA_HOMOLOG_SENHA_2', 'NOIVARA_HOMOLOG_CONTA_ID']) vi.stubEnv(name, '');
    mocks.headers.mockResolvedValue(new Headers({ origin: 'http://127.0.0.1:3000' }));
    await expect(signup(new FormData())).rejects.toThrow('REDIRECT:/cadastro?erro=dados');
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
