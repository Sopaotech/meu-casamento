import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), ownedWedding: vi.fn(), listOwnedGifts: vi.fn(), notFound: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/weddings', () => ({ ownedWedding: mocks.ownedWedding }));
vi.mock('@/lib/gifts', () => ({ listOwnedGifts: mocks.listOwnedGifts }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('../src/app/painel/[id]/presentes/actions', () => ({ createGiftAction: vi.fn(), updateGiftAction: vi.fn(), archiveGiftAction: vi.fn(), uploadGiftImageAction: vi.fn() }));
import GiftsEditor from '../src/app/painel/[id]/presentes/page';

describe('catálogo dos noivos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUser.mockResolvedValue({ id: 'owner' });
    mocks.ownedWedding.mockResolvedValue({ draftVersion: 7 });
    mocks.listOwnedGifts.mockResolvedValue([]);
    mocks.notFound.mockImplementation(() => { throw new Error('not-found'); });
  });
  it('apresenta os cards do rascunho com valor, estado e fotografia autorizada', async () => {
    mocks.listOwnedGifts.mockResolvedValue([
      { id: 'item1', name: 'Cafeteira', description: 'Para nossas manhãs', valueCents: 13990, imageId: 'a'.repeat(64), position: 1, active: true },
      { id: 'item2', name: 'Viagem', description: '', valueCents: null, imageId: null, position: 2, active: false },
    ]);
    const html = renderToStaticMarkup(await GiftsEditor({ params: Promise.resolve({ id: 'wedding' }), searchParams: Promise.resolve({}) }));
    expect(mocks.ownedWedding).toHaveBeenCalledWith('owner', 'wedding');
    expect(mocks.listOwnedGifts).toHaveBeenCalledWith('owner', 'wedding');
    for (const value of ['Cafeteira', 'Para nossas manhãs', '139,90', 'Ativo', 'Oculto', 'Contribuição livre', 'Editar e organizar', 'Arquivar presente', 'Pagamento está em desenvolvimento'.toLowerCase()]) {
      expect(html.toLowerCase()).toContain(value.toLowerCase());
    }
    expect(html).toContain(`/imagens-presente/${'a'.repeat(64)}`);
    expect(html).toContain('name="version" value="7"');
    expect(html).toContain('publicar ou republicar');
  });
  it('sugere ideias e preenche apenas sugestões reconhecidas', async () => {
    const render = async (ideia: string) => renderToStaticMarkup(await GiftsEditor({ params: Promise.resolve({ id: 'wedding' }), searchParams: Promise.resolve({ ideia }) }));
    const html = await render('Viagem');
    expect(html).toContain('Presente personalizado');
    expect(html).toMatch(/<input[^>]*id="new-name"[^>]*value="Viagem"/);
    expect(await render('texto inesperado')).not.toContain('value="texto inesperado"');
  });
  it('não apresenta a lista de outro casal', async () => {
    mocks.ownedWedding.mockResolvedValue(null);
    await expect(GiftsEditor({ params: Promise.resolve({ id: 'other' }), searchParams: Promise.resolve({}) })).rejects.toThrow('not-found');
    expect(mocks.listOwnedGifts).not.toHaveBeenCalled();
  });
});
