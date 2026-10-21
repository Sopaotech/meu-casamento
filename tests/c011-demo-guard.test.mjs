import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { validateContent } from '../src/lib/content';
import { validatePublicGifts } from '../src/lib/gift-content';
import { ACCOUNT_EMAIL, EXAMPLES, GIFT_IDEAS, bootstrapTransaction, validateSettings } from '../scripts/prepare-c011-demo.mjs';

const databaseName = 'noivara_c011_a1b2c3d4';
const confirmation = [`--confirm-db=${databaseName}`];
const settings = {
  NODE_ENV: 'production', RENDER: 'true', NOIVARA_HOMOLOGACAO: '1',
  NOIVARA_HOMOLOG_DATABASE_NAME: databaseName,
  NOIVARA_HOMOLOG_CONTA_ID: `c011_${'a'.repeat(32)}`,
  NOIVARA_HOMOLOG_CONTA_SENHA: 'b'.repeat(32),
  NOIVARA_HOMOLOG_USUARIO: 'demo', NOIVARA_HOMOLOG_SENHA: 'c'.repeat(32),
  APP_URL: 'https://example.onrender.com',
  DATABASE_URL: `postgresql://demo_user:example-password@dpg-example-a/${databaseName}?schema=public&sslmode=require`,
};
const names = ['20261018000000_initial', '20261019000000_photos', '20261019010000_photo_disk_storage', '20261019020000_gifts'];
const checksums = names.map((name) => ({ name, checksum: `${name}-test-checksum` }));
const tables = ['_prisma_migrations', 'AuthAttempt', 'GiftAudit', 'GiftImage', 'GiftItem', 'Photo', 'Publication', 'Session', 'User', 'Wedding'];

function fakeTransaction(options = {}) {
  const writes = [];
  const identity = options.identity ?? { database: databaseName, username: 'demo_user' };
  const relations = options.relations ?? tables.map((name) => ({ schema: 'public', name }));
  const migrations = options.migrations ?? checksums.map(({ name, checksum }) => ({ migration_name: name, checksum, finished_at: new Date(), rolled_back_at: null }));
  let giftId = 0;
  const tx = {
    $queryRaw: vi.fn(async (parts) => {
      const query = parts.join(' ');
      if (query.includes('current_database')) return [identity];
      if (query.includes('pg_catalog.pg_class')) return relations;
      if (query.includes('_prisma_migrations')) return migrations;
      throw new Error('Consulta inesperada no teste.');
    }),
    $executeRaw: vi.fn(async () => 0),
  };
  for (const model of ['user', 'session', 'authAttempt', 'wedding', 'photo', 'publication', 'giftImage', 'giftItem', 'giftAudit']) {
    tx[model] = { count: vi.fn(async () => options.occupied === model ? 1 : 0) };
  }
  tx.user.create = vi.fn(async ({ data }) => { writes.push({ model: 'user', data }); return { id: data.id }; });
  tx.wedding.create = vi.fn(async ({ data }) => { writes.push({ model: 'wedding', data }); return { id: `wedding_${writes.length}` }; });
  tx.wedding.update = vi.fn(async ({ where, data }) => { writes.push({ model: 'wedding-update', where, data }); });
  tx.giftItem.create = vi.fn(async ({ data }) => {
    writes.push({ model: 'giftItem', data });
    return { id: `gift_${++giftId}`, name: data.name, description: data.description, valueCents: data.valueCents, imageId: null };
  });
  tx.giftAudit.create = vi.fn(async ({ data }) => { writes.push({ model: 'giftAudit', data }); });
  tx.publication.create = vi.fn(async ({ data }) => { writes.push({ model: 'publication', data }); return { id: `revision_${writes.length}` }; });
  return { tx, writes };
}

describe('guarda da preparação C-011, sem conectar a um banco', () => {
  it('aceita somente configuração explícita de homologação e banco interno Render', () => {
    expect(validateSettings(settings, confirmation)).toMatchObject({ databaseName, accountId: settings.NOIVARA_HOMOLOG_CONTA_ID });
  });

  it.each([
    { NODE_ENV: 'development' }, { RENDER: 'false' }, { NOIVARA_HOMOLOGACAO: undefined },
    { NOIVARA_HOMOLOG_DATABASE_NAME: 'wedding_c010_demo_test' },
    { DATABASE_URL: `postgresql://demo:pass@127.0.0.1:5432/${databaseName}` },
    { DATABASE_URL: `postgresql://demo:pass@localhost:5432/${databaseName}` },
    { DATABASE_URL: `postgresql://demo:pass@dpg-example-a.oregon-postgres.render.com/${databaseName}` },
    { DATABASE_URL: 'postgresql://demo:pass@dpg-example-a/wedding_c010_demo_test' },
    { DATABASE_URL: `postgresql://demo:pass@dpg-example-a/${databaseName}?host=127.0.0.1` },
    { DATABASE_URL: `postgresql://demo:pass@dpg-example-a/${databaseName}?schema=private` },
    { DATABASE_URL: `postgresql://demo:pass@dpg-example-a/${databaseName}?schema=public&schema=public` },
    { DATABASE_URL: `postgresql://demo:pass@dpg-example-a/${databaseName}?sslmode=prefer` },
    { DATABASE_URL: `postgresql://demo:pass@dpg-example-a/${databaseName}?schema=public` },
    { APP_URL: 'http://example.onrender.com' }, { NOIVARA_HOMOLOG_CONTA_ID: 'outro_usuario' },
    { NOIVARA_HOMOLOG_CONTA_SENHA: 'curta' }, { NOIVARA_HOMOLOG_CONTA_SENHA: 'c'.repeat(32) },
    { NOIVARA_HOMOLOG_SENHA: undefined },
  ])('rejeita configurações incompletas ou destinos inadequados', (change) => {
    expect(() => validateSettings({ ...settings, ...change }, confirmation)).toThrow();
  });

  it('exige confirmação explícita e não aceita argumentos adicionais', () => {
    for (const args of [[], ['--confirm-db=outro'], [...confirmation, '--extra']]) {
      expect(() => validateSettings(settings, args)).toThrow();
    }
  });

  it('não expõe entradas sensíveis quando a execução é recusada', () => {
    const secret = 'valor-sensivel-de-teste-que-nao-deve-aparecer';
    const result = spawnSync(process.execPath, ['scripts/prepare-c011-demo.mjs'], {
      cwd: process.cwd(), env: { ...process.env, ...settings, DATABASE_URL: secret, NOIVARA_HOMOLOG_CONTA_SENHA: secret }, encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain(secret);
  });

  it.each(['user', 'session', 'authAttempt', 'wedding', 'photo', 'publication', 'giftImage', 'giftItem', 'giftAudit'])
  ('não grava se qualquer tabela da aplicação contém dados: %s', async (occupied) => {
    const { tx, writes } = fakeTransaction({ occupied });
    await expect(bootstrapTransaction(tx, { databaseName, databaseUser: 'demo_user', accountId: settings.NOIVARA_HOMOLOG_CONTA_ID }, checksums, 'hash')).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it.each([
    { identity: { database: 'banco_errado', username: 'demo_user' } },
    { relations: [...tables.map((name) => ({ schema: 'public', name })), { schema: 'public', name: 'OutroProjeto' }] },
    { relations: tables.map((name) => ({ schema: name === 'Wedding' ? 'outro' : 'public', name })) },
    { migrations: checksums.map(({ name, checksum }) => ({ migration_name: name, checksum: `${checksum}x`, finished_at: new Date(), rolled_back_at: null })) },
    { migrations: checksums.map(({ name, checksum }) => ({ migration_name: name, checksum, finished_at: null, rolled_back_at: null })) },
  ])('não grava se identidade, schema ou migrations não conferem', async (change) => {
    const { tx, writes } = fakeTransaction(change);
    await expect(bootstrapTransaction(tx, { databaseName, databaseUser: 'demo_user', accountId: settings.NOIVARA_HOMOLOG_CONTA_ID }, checksums, 'hash')).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('monta três sites válidos, listas e históricos, só para a conta de demonstração', async () => {
    const { tx, writes } = fakeTransaction();
    await bootstrapTransaction(tx, { databaseName, databaseUser: 'demo_user', accountId: settings.NOIVARA_HOMOLOG_CONTA_ID }, checksums, 'hash');
    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(writes.filter((item) => item.model === 'user')).toMatchObject([{ data: { email: ACCOUNT_EMAIL, id: settings.NOIVARA_HOMOLOG_CONTA_ID } }]);
    const weddings = writes.filter((item) => item.model === 'wedding');
    expect(weddings).toHaveLength(3);
    expect(weddings.every(({ data }) => data.ownerId === settings.NOIVARA_HOMOLOG_CONTA_ID)).toBe(true);
    expect(weddings.map(({ data }) => data.draft.template)).toEqual(EXAMPLES.map(({ template }) => template));
    expect(writes.filter((item) => item.model === 'giftItem')).toHaveLength(3 * GIFT_IDEAS.length);
    expect(writes.filter((item) => item.model === 'giftAudit')).toHaveLength(3 * GIFT_IDEAS.length);
    const publications = writes.filter((item) => item.model === 'publication');
    expect(publications).toHaveLength(3);
    for (const { data } of publications) {
      expect(validateContent(data.content).ok).toBe(true);
      expect(data.content.photoIds).toEqual([]);
      expect(validatePublicGifts(data.gifts)).toHaveLength(GIFT_IDEAS.length);
    }
  });
});
