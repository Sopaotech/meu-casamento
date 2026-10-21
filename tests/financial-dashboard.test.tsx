import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialDashboard } from '../src/components/financial-dashboard';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ headers: vi.fn(), notFound: vi.fn(), requireUser: vi.fn(), ownedWedding: vi.fn() }));
vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/weddings', () => ({ ownedWedding: mocks.ownedWedding }));
import FinancialDemo from '../src/app/demonstracao-local/financeiro/page';
import ReceiptsPage from '../src/app/painel/[id]/recebimentos/page';

describe('painel financeiro', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.notFound.mockImplementation(() => { throw new Error('not-found'); }); });
  it('sem provedor, não inventa valores ou transações', () => {
    const html = renderToStaticMarkup(createElement(FinancialDashboard));
    expect(html).toContain('Aguardando integração financeira');
    expect(html).toContain('Situação da conta vinculada');
    expect(html).toContain('Pagamentos pendentes');
    expect(html).toContain('Saldo disponível no provedor');
    for (const heading of ['Presente', 'Convidado', 'Valor', 'Data', 'Status', 'Identificador']) expect(html).toContain(`<th>${heading}</th>`);
    expect(html).not.toContain('15.000');
    expect(html).not.toContain('DEMO-001');
  });
  it('isola a página real pelo dono', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'other' }); mocks.ownedWedding.mockResolvedValue(null);
    await expect(ReceiptsPage({ params: Promise.resolve({ id: 'wedding' }) })).rejects.toThrow('not-found');
    expect(mocks.ownedWedding).toHaveBeenCalledWith('other', 'wedding');
  });
  it('a demonstração identifica os dados fictícios e só funciona localmente em desenvolvimento', async () => {
    mocks.headers.mockResolvedValue(new Headers({ host: '127.0.0.1:3000' }));
    vi.stubEnv('NODE_ENV', 'development');
    const html = renderToStaticMarkup(await FinancialDemo());
    expect(html).toContain('DADOS FICTÍCIOS — DEMONSTRAÇÃO');
    expect(html).toContain('15.000,00');
    expect(html).toContain('Nenhuma conta financeira foi vinculada nesta demonstração');
    mocks.headers.mockResolvedValue(new Headers({ host: 'example.com' }));
    await expect(FinancialDemo()).rejects.toThrow('not-found');
    mocks.headers.mockResolvedValue(new Headers({ host: 'localhost:3000' }));
    vi.stubEnv('NODE_ENV', 'production');
    await expect(FinancialDemo()).rejects.toThrow('not-found');
    vi.unstubAllEnvs();
  });
});
