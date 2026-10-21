import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), listWeddings: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/weddings', () => ({ listWeddings: mocks.listWeddings }));
import Dashboard from '../src/app/painel/page';
import { countdownToWedding } from '../src/lib/dashboard';

const photoId = 'a'.repeat(64);
const draft = {
  template: 'romantico', templateVersion: 1, coupleNames: 'Laura e Gabriel',
  eventDate: '2028-06-12', eventLocation: '', story: '', welcomeMessage: '', photoIds: [photoId],
};

describe('painel de casamentos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUser.mockResolvedValue({ id: 'owner', name: 'Laura' });
    mocks.listWeddings.mockResolvedValue([]);
  });

  it('exige sessão antes de consultar casamentos', async () => {
    mocks.requireUser.mockRejectedValue(new Error('login-required'));
    await expect(Dashboard()).rejects.toThrow('login-required');
    expect(mocks.listWeddings).not.toHaveBeenCalled();
  });

  it('mostra orientação e ação para uma conta sem casamentos', async () => {
    const html = renderToStaticMarkup(await Dashboard());
    expect(mocks.listWeddings).toHaveBeenCalledWith('owner');
    expect(html).toContain('BEM-VINDOS AO MEU CASAMENTO');
    expect(html).toContain('Olá, Laura!');
    expect(html).toContain('Seu primeiro site começa aqui');
    expect(html).toContain('href="/painel/novo"');
  });

  it('mostra dados do rascunho, foto privada, ações e status da publicação', async () => {
    mocks.listWeddings.mockResolvedValue([
      { id: 'abc', slug: 'laura-e-gabriel', draft, publishedRevisionId: 'revision', _count: { giftItems: 2 } },
      { id: 'def', slug: 'outro', draft: { ...draft, template: 'moderno', coupleNames: 'Ana e João', eventDate: '', photoIds: [] }, publishedRevisionId: null, _count: { giftItems: 0 } },
    ]);
    const html = renderToStaticMarkup(await Dashboard());
    expect(mocks.listWeddings).toHaveBeenCalledWith('owner');
    expect(html).toContain('Laura e Gabriel');
    expect(html).toContain('Olá, Laura e Gabriel!');
    expect(html).toContain('2 presentes cadastrados');
    expect(html).toContain('0 presentes cadastrados');
    expect(html).toContain('MODELO ROMÂNTICO');
    expect(html).toContain('12 de junho de 2028');
    expect(html).toContain(`src="/fotos/${photoId}"`);
    expect(html).toContain('Publicado');
    expect(html).toContain('Alterações no rascunho aparecem no site após republicar.');
    expect(html).toContain('href="/painel/abc"');
    expect(html).toContain('href="/painel/abc/previa"');
    expect(html).toContain('href="/painel/abc/presentes"');
    expect(html).toContain('href="/painel/abc/recebimentos"');
    expect(html).toContain('href="/s/laura-e-gabriel"');
    expect(html).not.toContain('href="/s/outro"');
    expect(html).toContain('MODELO MODERNO');
    expect(html).toContain('Data a definir');
    expect(html).toContain('Rascunho privado');
    expect(html).toContain('Uma história para celebrar');
  });
});

describe('contagem de dias', () => {
  it('considera a data no horário de São Paulo, incluindo o dia atual e datas passadas', () => {
    const now = new Date('2028-06-12T01:30:00Z'); // Ainda é dia 11 em São Paulo.
    expect(countdownToWedding('2028-06-12', now)).toBe('Falta 1 dia');
    expect(countdownToWedding('2028-06-11', now)).toBe('É hoje!');
    expect(countdownToWedding('2028-06-10', now)).toBe('Uma data para lembrar');
    expect(countdownToWedding('2028-06-14', now)).toBe('Faltam 3 dias');
  });
});
