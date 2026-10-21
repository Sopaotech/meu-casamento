/** Bootstrap fictitious C-011 data only in an explicitly confirmed, new Render database. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ACCOUNT_EMAIL = 'demo-caio-c011@example.test';
export const EXAMPLES = [
  { template: 'classico', coupleNames: 'Marina e Rafael', eventDate: '2028-05-20', eventLocation: 'Solar das Palmeiras', story: 'Nossa história começou com uma conversa que parecia não ter fim. Entre viagens, encontros de família e pequenos rituais, descobrimos que o amor mora nos detalhes.' },
  { template: 'romantico', coupleNames: 'Laura e Gabriel', eventDate: '2028-09-16', eventLocation: 'Jardim das Hortênsias', story: 'Nos conhecemos numa tarde de sol e música. Desde então, compartilhamos risadas, passeios e planos. Queremos celebrar esse novo capítulo perto de quem amamos.' },
  { template: 'moderno', coupleNames: 'Júlia e Henrique', eventDate: '2029-03-10', eventLocation: 'Espaço Horizonte', story: 'Entre a cidade, os cafés favoritos e muitas conversas, encontramos um jeito próprio de caminhar juntos. Nossa celebração reúne o que é simples e verdadeiro.' },
];
export const GIFT_IDEAS = [
  { name: 'Jantar romântico', description: 'Uma noite especial para celebrarmos juntos.', valueCents: 18000 },
  { name: 'Lua de mel', description: 'Uma contribuição para nossa primeira viagem como casados.', valueCents: 35000 },
  { name: 'Cafeteira', description: 'Um carinho simbólico para nossas manhãs.', valueCents: 24000 },
  { name: 'Jogo de jantar', description: 'Para tantos encontros à mesa que ainda virão.', valueCents: 22000 },
  { name: 'Viagem', description: 'Uma contribuição para nossos próximos passeios.', valueCents: 15000 },
  { name: 'Presente personalizado', description: 'Uma contribuição livre para nossa nova vida.', valueCents: null },
];

const MIGRATION_NAMES = [
  '20261018000000_initial',
  '20261019000000_photos',
  '20261019010000_photo_disk_storage',
  '20261019020000_gifts',
];
const TABLES = ['_prisma_migrations', 'AuthAttempt', 'GiftAudit', 'GiftImage', 'GiftItem', 'Photo', 'Publication', 'Session', 'User', 'Wedding'];

class GuardError extends Error {
  constructor() { super('Destino ou configuração da homologação não confirmado.'); }
}
const refuse = () => { throw new GuardError(); };

/** These checks run before loading Prisma or opening any connection. */
export function validateSettings(env, args) {
  if (env.NODE_ENV !== 'production' || env.RENDER !== 'true' || env.NOIVARA_HOMOLOGACAO !== '1') refuse();
  const databaseName = env.NOIVARA_HOMOLOG_DATABASE_NAME ?? '';
  if (!/^noivara_c011_[a-f0-9]{8,32}$/.test(databaseName)
    || args.length !== 1 || args[0] !== `--confirm-db=${databaseName}`) refuse();

  const accountId = env.NOIVARA_HOMOLOG_CONTA_ID ?? '';
  const accountPassword = env.NOIVARA_HOMOLOG_CONTA_SENHA ?? '';
  const perimeterUser = env.NOIVARA_HOMOLOG_USUARIO ?? '';
  const perimeterPassword = env.NOIVARA_HOMOLOG_SENHA ?? '';
  if (!/^c011_[a-f0-9]{32}$/.test(accountId)
    || !/^[\x21-\x7e]{32,72}$/.test(accountPassword)
    || !/^[A-Za-z0-9._-]{1,64}$/.test(perimeterUser)
    || !/^[\x21-\x7e]{32,128}$/.test(perimeterPassword)
    || accountPassword === perimeterPassword) refuse();

  let origin;
  let url;
  try {
    origin = new URL(env.APP_URL ?? '');
    url = new URL(env.DATABASE_URL ?? '');
  } catch { refuse(); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) refuse();
  // Require Render's internal host. Refuse external, local, IP, multi-host and URL options
  // that could redirect the connection or select a different schema.
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !/^dpg-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.hostname)
    || (url.port && url.port !== '5432') || url.pathname !== `/${databaseName}` || !url.username || !url.password || url.hash) refuse();
  const params = [...url.searchParams.entries()];
  if (url.searchParams.get('sslmode') !== 'require'
    || params.some(([key, value]) => !((key === 'schema' && value === 'public') || (key === 'sslmode' && value === 'require')))
    || new Set(params.map(([key]) => key)).size !== params.length) refuse();
  let databaseUser;
  try { databaseUser = decodeURIComponent(url.username); } catch { refuse(); }
  return { databaseName, databaseUser, databaseUrl: url.toString(), accountId, accountPassword };
}

async function migrationChecksums() {
  return Promise.all(MIGRATION_NAMES.map(async (name) => {
    const bytes = await readFile(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url));
    return { name, checksum: createHash('sha256').update(bytes).digest('hex') };
  }));
}

/** All checks and inserts are in one transaction; no existing row is ever changed. */
export async function bootstrapTransaction(tx, settings, checksums, passwordHash) {
  const identity = await tx.$queryRaw`SELECT current_database() AS database, current_user AS username`;
  if (identity.length !== 1 || identity[0].database !== settings.databaseName || identity[0].username !== settings.databaseUser) refuse();

  const relations = await tx.$queryRaw`
    SELECT n.nspname AS schema, c.relname AS name
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
      AND n.nspname <> 'information_schema' AND n.nspname !~ '^pg_'
  `;
  const names = relations.filter((row) => row.schema === 'public').map((row) => row.name).sort();
  if (relations.length !== TABLES.length || JSON.stringify(names) !== JSON.stringify([...TABLES].sort())) refuse();

  // Block concurrent application writes until emptiness has been checked and the transaction commits.
  await tx.$executeRaw`LOCK TABLE "public"."_prisma_migrations", "public"."AuthAttempt", "public"."GiftAudit", "public"."GiftImage", "public"."GiftItem", "public"."Photo", "public"."Publication", "public"."Session", "public"."User", "public"."Wedding" IN SHARE ROW EXCLUSIVE MODE`;
  const migrations = await tx.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "public"."_prisma_migrations"`;
  if (migrations.length !== checksums.length || checksums.length !== MIGRATION_NAMES.length
    || checksums.some(({ name, checksum }) => {
      const matches = migrations.filter((migration) => migration.migration_name === name);
      return matches.length !== 1 || matches[0].checksum !== checksum || !matches[0].finished_at || matches[0].rolled_back_at;
    })) refuse();

  const counts = await Promise.all([
    tx.user.count(), tx.session.count(), tx.authAttempt.count(), tx.wedding.count(), tx.photo.count(),
    tx.publication.count(), tx.giftImage.count(), tx.giftItem.count(), tx.giftAudit.count(),
  ]);
  if (counts.some((count) => count !== 0)) refuse();

  await tx.user.create({ data: { id: settings.accountId, email: ACCOUNT_EMAIL, name: 'Demonstração C-011', passwordHash } });
  for (const example of EXAMPLES) {
    const content = {
      ...example,
      templateVersion: 1,
      welcomeMessage: 'Sejam bem-vindos! Este casamento e os dados apresentados são fictícios; as fotografias são ilustrativas.',
      photoIds: [],
    };
    const wedding = await tx.wedding.create({ data: { ownerId: settings.accountId, slug: `demo-c011-${example.template}`, draft: content }, select: { id: true } });
    const publicGifts = [];
    for (const [position, idea] of GIFT_IDEAS.entries()) {
      const gift = await tx.giftItem.create({ data: { ...idea, weddingId: wedding.id, position }, select: { id: true, name: true, description: true, valueCents: true, imageId: true } });
      publicGifts.push(gift);
      await tx.giftAudit.create({ data: { giftId: gift.id, weddingId: wedding.id, action: 'created', snapshot: { ...idea, imageId: null, position, active: true, archived: false } } });
    }
    const revision = await tx.publication.create({ data: { weddingId: wedding.id, content, gifts: publicGifts }, select: { id: true } });
    // This wedding was created earlier in this same transaction; no existing wedding is updated.
    await tx.wedding.update({ where: { id: wedding.id }, data: { publishedRevisionId: revision.id } });
  }
}

async function main() {
  const settings = validateSettings(process.env, process.argv.slice(2));
  const checksums = await migrationChecksums();
  const [{ PrismaClient }, { default: bcrypt }] = await Promise.all([import('@prisma/client'), import('bcryptjs')]);
  const passwordHash = await bcrypt.hash(settings.accountPassword, 12);
  const db = new PrismaClient({ datasources: { db: { url: settings.databaseUrl } } });
  try {
    await db.$transaction((tx) => bootstrapTransaction(tx, settings, checksums, passwordHash), { timeout: 30000 });
    console.log('Preparação fictícia concluída.');
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Database/driver errors may contain a URL or credentials: never print the error.
    console.error('Preparação interrompida. Confira a configuração e o estado do banco exclusivo antes de qualquer nova tentativa.');
    process.exitCode = 1;
  });
}
