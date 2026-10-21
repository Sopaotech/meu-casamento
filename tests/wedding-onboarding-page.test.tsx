import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('../src/app/painel/actions', () => ({ createWeddingAction: vi.fn() }));
import NewWedding from '../src/app/painel/novo/page';

describe('formulário de criação', () => {
  beforeEach(() => { mocks.requireUser.mockReset(); });

  it('pede os dois nomes e mantém a conta autenticada', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'owner' });
    const html = renderToStaticMarkup(await NewWedding({ searchParams: Promise.resolve({}) }));
    expect(mocks.requireUser).toHaveBeenCalled();
    expect(html).toContain('Nome da primeira pessoa');
    expect(html).toContain('Nome da segunda pessoa');
    expect(html).toContain('name="firstName"');
    expect(html).toContain('name="secondName"');
    expect(html).toContain('name="slug"');
  });

  it('não apresenta o formulário sem sessão', async () => {
    mocks.requireUser.mockRejectedValue(new Error('login-required'));
    await expect(NewWedding({ searchParams: Promise.resolve({}) })).rejects.toThrow('login-required');
  });
});
