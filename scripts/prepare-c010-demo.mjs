/** Create only isolated C-010 examples, using the application's real write and publication flows. */
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const database = 'wedding_c010_demo_test';
const origin = 'http://127.0.0.1:3113';
const accountId = 'c010_demo_account';
const email = 'demo-caio-c010@example.test';
const accountName = 'Demonstração C-010';
const sources = path.resolve('.tmp/c007-demo-source');
const examples = [
  { template: 'classico', first: 'Marina', second: 'Rafael', date: '2028-05-20', location: 'Solar das Palmeiras', story: 'Nossa história começou com uma conversa que parecia não ter fim. Entre viagens, encontros de família e pequenos rituais, descobrimos que o amor mora nos detalhes.' },
  { template: 'romantico', first: 'Laura', second: 'Gabriel', date: '2028-09-16', location: 'Jardim das Hortênsias', story: 'Nos conhecemos numa tarde de sol e música. Desde então, compartilhamos risadas, passeios e planos. Queremos celebrar esse novo capítulo perto de quem amamos.' },
  { template: 'moderno', first: 'Júlia', second: 'Henrique', date: '2029-03-10', location: 'Espaço Horizonte', story: 'Entre a cidade, os cafés favoritos e muitas conversas, encontramos um jeito próprio de caminhar juntos. Nossa celebração reúne o que é simples e verdadeiro.' },
];
const hashes = {
  classico: ['bf6fb15c9ce16c0992bbb874c55ad52bb1321b04e6123e91f077e8b7f9dd3fa2', 'eeadb1f9cbcfd94a824d0c4b2d9db2c0c6013ff6f64b82ef8061386ba3548f8e', '87d66c69736e7b81f1cbd8c5b24ae5907d03e5241049b7fe56bb44d88cee7745'],
  romantico: ['9b3c98aca46903a48a1b64d3e4f289b9a341556f356270e5a74355d10b31f825', '6860ab95a541bbb9106756d0e76e4864ef9581223887c24851eac7c36e69245f', '98488282365c1e39bbfba9e5b34e2cdcfc8ff550ce3f7a661ae9794ac42695b1'],
  moderno: ['cf88c25fe7c573b034f355d339bc1175866de086f60ffa8429919070e9a33c73', 'e70a5bcad7cf5b8aa56108a9b7f9d8f3b8e08cdbaccc9bcd7a92969a2996f411', 'e1760b4339ec99c704ef90ec7eacea40be94365ee7842d2546bf43f72023bbac'],
};
const giftIdeas = [
  { name: 'Jantar romântico', description: 'Uma noite especial para celebrarmos juntos.', amount: '180,00', image: true },
  { name: 'Lua de mel', description: 'Uma contribuição para nossa primeira viagem como casados.', amount: '350,00' },
  { name: 'Cafeteira', description: 'Um carinho simbólico para nossas manhãs.', amount: '240,00' },
  { name: 'Jogo de jantar', description: 'Para tantos encontros à mesa que ainda virão.', amount: '220,00' },
  { name: 'Viagem', description: 'Ajude a tornar nossos próximos passeios inesquecíveis.', amount: '150,00' },
  { name: 'Presente personalizado', description: 'Uma contribuição livre para nossa nova vida.', amount: '' },
];

function checkDestination() {
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? '')) throw new Error('Defina NODE_ENV=development ou test.');
  if (process.argv.length !== 3 || process.argv[2] !== `--confirm-db=${database}`) throw new Error(`Confirme o destino com --confirm-db=${database}.`);
  if (process.env.DEMO_APP_URL !== origin) throw new Error(`DEMO_APP_URL deve ser ${origin}.`);
  let url;
  try { url = new URL(process.env.DEMO_DATABASE_URL ?? ''); } catch { throw new Error('URL do banco de demonstração inválida.'); }
  const parameters = [...url.searchParams.keys()];
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' || url.port !== '55445' ||
      url.pathname !== `/${database}` || url.username !== 'c010_demo' || !url.password || url.hash ||
      parameters.length !== 1 || url.searchParams.get('schema') !== 'public') throw new Error('Banco não corresponde ao destino exclusivo C-010.');
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Informe uma senha fictícia de 12 a 72 bytes em DEMO_PASSWORD.');
  return { databaseUrl: url.toString(), password };
}

function decode(value) {
  return value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}
function forms(html) { return [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(match => match[0]); }
function formData(html) {
  const data = new FormData();
  for (const match of html.matchAll(/<input\s+[^>]*type="hidden"[^>]*>/g)) {
    const name = match[0].match(/name="([^"]+)"/)?.[1];
    const value = match[0].match(/value="([^"]*)"/)?.[1] ?? '';
    if (name) data.append(decode(name), decode(value));
  }
  if (![...data.keys()].some(name => name.startsWith('$ACTION_'))) throw new Error('Formulário sem ação reconhecida.');
  return data;
}
function requireForm(html, predicate, description) {
  const matches = forms(html).filter(predicate);
  if (matches.length !== 1) throw new Error(`Formulário ${description} não foi identificado com segurança.`);
  return matches[0];
}

async function main() {
  const { databaseUrl, password } = checkDestination();
  // Check all the source files before creating even the account; never fetch a replacement silently.
  const photos = {};
  for (const example of examples) {
    photos[example.template] = [];
    for (let index = 0; index < 3; index++) {
      const file = await readFile(path.join(sources, `${example.template}-${index + 1}.jpg`));
      if (createHash('sha256').update(file).digest('hex') !== hashes[example.template][index]) throw new Error(`Imagem ${example.template}-${index + 1} difere da fonte documentada.`);
      photos[example.template].push(file);
    }
  }
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await db.$connect();
    const destination = await db.$queryRaw`SELECT current_database() AS database, current_user AS username`;
    if (destination[0]?.database !== database || destination[0]?.username !== 'c010_demo') throw new Error('O PostgreSQL não confirmou o banco e o usuário dedicados.');
    const byEmail = await db.user.findUnique({ where: { email }, select: { id: true, name: true, passwordHash: true } });
    const byId = await db.user.findUnique({ where: { id: accountId }, select: { id: true, email: true } });
    if ((byEmail && (byEmail.id !== accountId || byEmail.name !== accountName || !await bcrypt.compare(password, byEmail.passwordHash))) ||
        (byId && byId.email !== email)) throw new Error('Colisão na conta fictícia ou senha diferente; nada foi sobrescrito.');
    const existing = new Map();
    for (const example of examples) {
      const slug = `demo-c010-${example.template}`;
      const prior = await db.wedding.findUnique({ where: { slug }, select: { id: true, ownerId: true, draft: true, publishedRevisionId: true, _count: { select: { giftItems: true } } } });
      if (prior && prior.ownerId !== accountId) throw new Error(`O endereço ${slug} pertence a outra conta; nenhuma alteração foi feita.`);
      existing.set(slug, prior);
    }
    function reportExisting(slug, prior) {
      console.log(`${slug}: já existe; dados e edições preservados. ${origin}/painel/${prior.id}`);
      if (!prior.publishedRevisionId || !Array.isArray(prior.draft?.photoIds) || prior.draft.photoIds.length < 3 || prior._count.giftItems < giftIdeas.length) console.warn(`${slug}: exemplo incompleto ou editado; complete manualmente.`);
    }
    // A completed repeat is strictly read-only, including sessions.
    if (byEmail && examples.every(example => existing.get(`demo-c010-${example.template}`))) {
      for (const example of examples) reportExisting(`demo-c010-${example.template}`, existing.get(`demo-c010-${example.template}`));
      return;
    }
    if (!byEmail) await db.user.create({ data: { id: accountId, email, name: accountName, passwordHash: await bcrypt.hash(password, 12) } });

    // A random session is inserted in the confirmed database, then tested via a read-only request.
    // No POST reaches the app until the response proves it reads this exact database and account.
    const token = randomBytes(32).toString('hex');
    await db.session.create({ data: { userId: accountId, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const cookie = `wedding-session=${token}`;
    async function get(route) {
      const response = await fetch(origin + route, { headers: { cookie }, redirect: 'manual' });
      if (response.status !== 200) throw new Error(`A aplicação não confirmou o banco de demonstração ao acessar ${route} (${response.status}).`);
      return response.text();
    }
    async function post(route, data, expected) {
      const response = await fetch(origin + route, { method: 'POST', headers: { cookie, origin, referer: origin + route }, body: data, redirect: 'manual' });
      const location = response.headers.get('location') ?? '';
      if (response.status !== 303 || !expected.test(location)) throw new Error(`Ação em ${route} não foi concluída (${response.status}; ${location}).`);
      return location;
    }
    if (!(await get('/painel')).includes(accountName)) throw new Error('A sessão não corresponde à conta de demonstração confirmada.');

    for (const example of examples) {
      const slug = `demo-c010-${example.template}`;
      const prior = await db.wedding.findUnique({ where: { slug }, select: { id: true, ownerId: true, draft: true, publishedRevisionId: true, _count: { select: { giftItems: true } } } });
      if (prior) {
        if (prior.ownerId !== accountId) throw new Error(`Colisão no endereço ${slug}; nada foi sobrescrito.`);
        reportExisting(slug, prior);
        continue;
      }
      const create = formData(requireForm(await get('/painel/novo'), form => form.includes('name="slug"'), 'de criação'));
      create.set('firstName', example.first); create.set('secondName', example.second); create.set('slug', slug);
      const created = await post('/painel/novo', create, /^\/painel\/[^?]+\?estado=criado$/);
      const id = created.match(/^\/painel\/([^?]+)/)[1];
      if (!await db.wedding.findFirst({ where: { id, ownerId: accountId, slug }, select: { id: true } })) throw new Error('Casamento criado não corresponde ao banco e à conta confirmados.');
      const route = `/painel/${id}`;
      const edit = formData(requireForm(await get(route), form => form.includes('name="template"'), 'de edição'));
      edit.set('template', example.template); edit.set('coupleNames', `${example.first} e ${example.second}`); edit.set('eventDate', example.date);
      edit.set('eventLocation', example.location); edit.set('welcomeMessage', 'Sejam bem-vindos ao nosso espaço! Este é um exemplo fictício; fotografias ilustrativas.'); edit.set('story', example.story);
      await post(route, edit, /\?estado=salvo$/);
      for (let index = 0; index < 3; index++) {
        const upload = formData(requireForm(await get(route), form => form.includes('name="photo"'), 'de fotografia'));
        upload.set('photo', new Blob([photos[example.template][index]], { type: 'image/jpeg' }), `${example.template}-${index + 1}.jpg`);
        await post(route, upload, /\?estado=foto-adicionada$/);
      }
      const giftRoute = `${route}/presentes`;
      for (const idea of giftIdeas) {
        const add = formData(requireForm(await get(giftRoute), form => form.includes('name="amount"') && !form.includes('name="giftId"'), 'de criação de presente'));
        add.set('name', idea.name); add.set('description', idea.description); add.set('amount', idea.amount);
        await post(giftRoute, add, /\?estado=created$/);
        if (idea.image) {
          const gift = await db.giftItem.findFirst({ where: { weddingId: id, name: idea.name, archivedAt: null }, select: { id: true } });
          if (!gift) throw new Error('Presente criado não encontrado no banco confirmado.');
          const image = formData(requireForm(await get(giftRoute), form => form.includes('name="image"') && form.includes(`value="${gift.id}"`), 'de imagem do presente'));
          image.set('image', new Blob([photos.classico[2]], { type: 'image/jpeg' }), 'classico-3.jpg');
          await post(giftRoute, image, /\?estado=image$/);
        }
      }
      const publish = formData(requireForm(await get(route), form => form.includes('Publicar site'), 'de publicação'));
      await post(route, publish, /\?estado=publicado$/);
      await get(`${route}/previa`);
      console.log(`${slug}: criado e publicado. Painel: ${origin}${route} | Site: ${origin}/s/${slug}`);
    }
  } finally { await db.$disconnect(); }
}

main().catch(error => { console.error(`Demonstração interrompida: ${error.message}`); process.exitCode = 1; });
