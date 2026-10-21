import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ headers: vi.fn(), requireUser: vi.fn(), ownedWedding: vi.fn(), notFound: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/weddings', () => ({ ownedWedding: mocks.ownedWedding }));
import HomologationFinancialDemo from '../src/app/painel/[id]/recebimentos/demonstracao/page';
import ReceiptsPage from '../src/app/painel/[id]/recebimentos/page';

const secret = 'SYNTHETIC-test-password-0123456789';
const basic = `Basic ${Buffer.from(`viewer:${secret}`).toString('base64')}`;
const params = Promise.resolve({ id: 'wedding' });
function configure() {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
  vi.stubEnv('NOIVARA_HOMOLOGACAO', '1');
  vi.stubEnv('NOIVARA_HOMOLOG_USUARIO', 'viewer');
  vi.stubEnv('NOIVARA_HOMOLOG_SENHA', secret);
  vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', 'demo_account');
}

describe('exemplo financeiro isolado', () => {
  beforeEach(() => {
    vi.resetAllMocks(); configure();
    mocks.headers.mockResolvedValue(new Headers({ authorization: basic }));
    mocks.requireUser.mockResolvedValue({ id: 'demo_account' });
    mocks.ownedWedding.mockResolvedValue({ id: 'wedding' });
    mocks.notFound.mockImplementation(() => { throw new Error('NOT_FOUND'); });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('apresenta exemplo rotulado apenas para a conta demo no casamento próprio', async () => {
    const html = renderToStaticMarkup(await HomologationFinancialDemo({ params }));
    expect(html).toContain('DADOS FICTÍCIOS — DEMONSTRAÇÃO');
    expect(html).toContain('15.000,00');
    expect(html).toContain('Nenhuma conta financeira foi vinculada nesta demonstração');
    expect(mocks.ownedWedding).toHaveBeenCalledWith('demo_account', 'wedding');
    const realHtml = renderToStaticMarkup(await ReceiptsPage({ params }));
    expect(realHtml).toContain('/recebimentos/demonstracao');
    expect(realHtml).not.toContain('15.000,00');
  });

  it('recusa acesso anônimo e acesso sem o perímetro', async () => {
    mocks.requireUser.mockRejectedValue(new Error('LOGIN_REQUIRED'));
    await expect(HomologationFinancialDemo({ params })).rejects.toThrow('LOGIN_REQUIRED');
    expect(mocks.ownedWedding).not.toHaveBeenCalled();
    mocks.headers.mockResolvedValue(new Headers());
    await expect(HomologationFinancialDemo({ params })).rejects.toThrow('Acesso de homologação negado');
  });

  it('recusa outra conta ou casamento que não pertence à conta demo', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'other_account' });
    await expect(HomologationFinancialDemo({ params })).rejects.toThrow('NOT_FOUND');
    expect(mocks.ownedWedding).not.toHaveBeenCalled();
    mocks.requireUser.mockResolvedValue({ id: 'demo_account' });
    mocks.ownedWedding.mockResolvedValue(null);
    await expect(HomologationFinancialDemo({ params })).rejects.toThrow('NOT_FOUND');
  });

  it('desativa a página e o link quando o modo está ausente ou incompleto', async () => {
    for (const name of ['NOIVARA_HOMOLOGACAO', 'NOIVARA_HOMOLOG_USUARIO', 'NOIVARA_HOMOLOG_SENHA', 'NOIVARA_HOMOLOG_CONTA_ID']) vi.stubEnv(name, '');
    await expect(HomologationFinancialDemo({ params })).rejects.toThrow('NOT_FOUND');
    expect(renderToStaticMarkup(await ReceiptsPage({ params }))).not.toContain('/recebimentos/demonstracao');
    configure();
    vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', '');
    await expect(HomologationFinancialDemo({ params })).rejects.toThrow('Acesso de homologação negado');
  });
});
