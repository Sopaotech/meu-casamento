import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { wedding: { findMany: mocks.findMany } } }));
import { listWeddings } from '../src/lib/weddings';

describe('consulta do painel', () => {
  it('limita os casamentos ao proprietário e conta apenas presentes não arquivados', async () => {
    mocks.findMany.mockResolvedValue([]);
    await listWeddings('owner');
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId: 'owner' },
      select: expect.objectContaining({
        _count: { select: { giftItems: { where: { archivedAt: null } } } },
      }),
    }));
  });
});
