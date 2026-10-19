import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), ownedWedding: vi.fn(), notFound: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/weddings', () => ({ ownedWedding: mocks.ownedWedding }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
import Preview from '../src/app/painel/[id]/previa/page';

describe('prévia privada', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.notFound.mockImplementation(() => { throw new Error('not-found'); });
  });

  it('exige sessão antes de consultar o casamento', async () => {
    mocks.requireUser.mockRejectedValue(new Error('login-required'));
    await expect(Preview({ params: Promise.resolve({ id: 'wedding' }) })).rejects.toThrow('login-required');
    expect(mocks.ownedWedding).not.toHaveBeenCalled();
  });

  it('nega a prévia quando o casamento não pertence à sessão', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'other-user' });
    mocks.ownedWedding.mockResolvedValue(null);
    await expect(Preview({ params: Promise.resolve({ id: 'wedding' }) })).rejects.toThrow('not-found');
    expect(mocks.ownedWedding).toHaveBeenCalledWith('other-user', 'wedding');
  });
});
