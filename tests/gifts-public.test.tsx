import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({ publicPage: vi.fn(), notFound: vi.fn(), getUser: vi.fn(), accessibleGiftImage: vi.fn() }));
vi.mock('@/lib/weddings', () => ({ publicPage: mocks.publicPage }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/lib/auth', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/gifts', () => ({ accessibleGiftImage: mocks.accessibleGiftImage }));
import PublishedSite from '../src/app/s/[slug]/page';
import { GET } from '../src/app/imagens-presente/[id]/route';

describe('acesso público aos presentes', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.notFound.mockImplementation(() => { throw new Error('not-found'); }); });
  it('retorna 404 para casamento privado ou inexistente', async () => {
    mocks.publicPage.mockResolvedValue(null);
    await expect(PublishedSite({ params: Promise.resolve({ slug: 'casal-teste' }) })).rejects.toThrow('not-found');
  });
  it('exibe os presentes do snapshot sem autenticação do convidado', async () => {
    mocks.publicPage.mockResolvedValue({ content: { template: 'classico', templateVersion: 1, coupleNames: 'Ana e Bia', eventDate: '', eventLocation: '', story: '', welcomeMessage: '', photoIds: [] }, gifts: [{ id: 'gift', name: 'Jantar', description: '', valueCents: 10000, imageId: null }] });
    const html = renderToStaticMarkup(await PublishedSite({ params: Promise.resolve({ slug: 'casal-teste' }) }));
    expect(html).toContain('Jantar');
    expect(html).toContain('Pagamento em desenvolvimento');
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('não entrega imagem de presente sem autorização', async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.accessibleGiftImage.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/imagens-presente/id'), { params: Promise.resolve({ id: 'id' }) });
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.accessibleGiftImage).toHaveBeenCalledWith('id', null);
  });
});
