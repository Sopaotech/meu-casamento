import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), assertSameOrigin: vi.fn(), createWedding: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/security', () => ({ assertSameOrigin: mocks.assertSameOrigin }));
vi.mock('@/lib/weddings', () => ({ createWedding: mocks.createWedding, WeddingError: class extends Error {} }));
vi.mock('@/lib/photos', () => ({ PhotoError: class extends Error {} }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error('NOT_FOUND'); },
}));
import { createWeddingAction } from '../src/app/painel/actions';

describe('criação de casamento', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUser.mockResolvedValue({ id: 'owner' });
    mocks.createWedding.mockResolvedValue({ id: 'wedding' });
  });

  it('valida a sessão e grava os dois nomes no campo existente', async () => {
    const form = new FormData();
    form.set('slug', 'Ana e João');
    form.set('firstName', ' Ana ');
    form.set('secondName', ' João ');
    await expect(createWeddingAction(form)).rejects.toThrow('REDIRECT:/painel/wedding?estado=criado');
    expect(mocks.assertSameOrigin).toHaveBeenCalled();
    expect(mocks.requireUser).toHaveBeenCalled();
    expect(mocks.createWedding).toHaveBeenCalledWith('owner', 'ana-e-joao', 'Ana e João');
  });

  it('aceita o envio legado e rejeita nomes incompletos ou acima do limite', async () => {
    const form = new FormData();
    form.set('slug', 'ana-e-joao');
    form.set('coupleNames', 'Ana e João');
    await expect(createWeddingAction(form)).rejects.toThrow('REDIRECT:/painel/wedding?estado=criado');
    expect(mocks.createWedding).toHaveBeenCalledWith('owner', 'ana-e-joao', 'Ana e João');
    mocks.createWedding.mockClear();
    form.set('firstName', 'Ana');
    form.set('secondName', ' ');
    await expect(createWeddingAction(form)).rejects.toThrow('REDIRECT:/painel/novo?estado=invalido');
    form.set('firstName', 'A'.repeat(120));
    form.set('secondName', 'João');
    await expect(createWeddingAction(form)).rejects.toThrow('REDIRECT:/painel/novo?estado=invalido');
    expect(mocks.createWedding).not.toHaveBeenCalled();
  });

  it('não cria casamento sem sessão', async () => {
    mocks.requireUser.mockRejectedValue(new Error('login-required'));
    await expect(createWeddingAction(new FormData())).rejects.toThrow('login-required');
    expect(mocks.createWedding).not.toHaveBeenCalled();
  });
});
