/** Prepare only the isolated W-004/W-005 environment through the real app flows. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const email = 'w005-visual-1792422374972@example.test';
const expectedDb = 'wedding_w004_test';
const origin = 'http://127.0.0.1:3104';
const source = path.resolve('.tmp/c007-demo-source');
const examples = [
  { template: 'classico', names: 'Marina e Rafael', date: '2028-05-20', location: 'Cerimônia e recepção no Solar das Palmeiras', welcome: 'Sejam bem-vindos ao nosso encontro. Estamos felizes por celebrar este dia com vocês. Demonstração fictícia; fotografias ilustrativas.', story: 'Nossa história começou em uma tarde tranquila, com uma conversa que parecia não ter fim. Entre viagens, encontros de família e pequenos rituais, descobrimos que o amor também mora nos detalhes. Agora queremos celebrar esse novo capítulo com as pessoas que fazem parte dele.' },
  { template: 'romantico', names: 'Laura e Gabriel', date: '2028-09-16', location: 'Cerimônia ao ar livre e recepção no Jardim das Hortênsias', welcome: 'Que alegria ter vocês por perto! Preparamos este cantinho com carinho para celebrar juntos. Demonstração fictícia; fotografias ilustrativas.', story: 'Nos conhecemos em um jardim, numa tarde de sol e música. Desde então, construímos uma história cheia de risadas, passeios ao ar livre e planos compartilhados. Nosso desejo é reunir quem amamos para uma celebração leve, cercada de natureza e afeto.' },
  { template: 'moderno', names: 'Júlia e Henrique', date: '2029-03-10', location: 'Cerimônia e recepção no Espaço Horizonte', welcome: 'Uma nova fase começa aqui. Esperamos vocês para celebrar conosco. Demonstração fictícia; fotografias ilustrativas.', story: 'Entre a cidade, os cafés favoritos e muitas conversas, encontramos um jeito próprio de caminhar juntos. Gostamos do que é simples, verdadeiro e cheio de significado. Esta celebração reúne tudo isso e as pessoas que queremos por perto.' },
];
const files = {
  classico: ['bf6fb15c9ce16c0992bbb874c55ad52bb1321b04e6123e91f077e8b7f9dd3fa2','eeadb1f9cbcfd94a824d0c4b2d9db2c0c6013ff6f64b82ef8061386ba3548f8e','87d66c69736e7b81f1cbd8c5b24ae5907d03e5241049b7fe56bb44d88cee7745'],
  romantico: ['9b3c98aca46903a48a1b64d3e4f289b9a341556f356270e5a74355d10b31f825','6860ab95a541bbb9106756d0e76e4864ef9581223887c24851eac7c36e69245f','98488282365c1e39bbfba9e5b34e2cdcfc8ff550ce3f7a661ae9794ac42695b1'],
  moderno: ['cf88c25fe7c573b034f355d339bc1175866de086f60ffa8429919070e9a33c73','e70a5bcad7cf5b8aa56108a9b7f9d8f3b8e08cdbaccc9bcd7a92969a2996f411','e1760b4339ec99c704ef90ec7eacea40be94365ee7842d2546bf43f72023bbac'],
};

function checkDestination() {
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? '')) throw new Error('Defina NODE_ENV=development ou test.');
  if (process.argv.length !== 3 || process.argv[2] !== `--confirm-db=${expectedDb}`) throw new Error(`Confirme o destino com --confirm-db=${expectedDb}.`);
  if (process.env.DEMO_APP_URL !== origin) throw new Error(`DEMO_APP_URL deve ser ${origin}.`);
  const url = new URL(process.env.DEMO_DATABASE_URL ?? '');
  const parameters = [...url.searchParams.keys()];
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== `/${expectedDb}` || url.hash || parameters.length !== 1 || url.searchParams.get('schema') !== 'public') throw new Error('Banco não corresponde ao destino isolado W-004.');
  if (!process.env.DEMO_PASSWORD) throw new Error('Informe DEMO_PASSWORD para a conta fictícia.');
  return url.toString();
}

function decode(value) {
  return value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

function forms(html) { return [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map((match) => match[0]); }
function formData(html) {
  const data = new FormData();
  for (const match of html.matchAll(/<input\s+[^>]*type="hidden"[^>]*>/g)) {
    const name = match[0].match(/name="([^"]+)"/)?.[1];
    const value = match[0].match(/value="([^"]*)"/)?.[1] ?? '';
    if (name) data.append(decode(name), decode(value));
  }
  if (![...data.keys()].some((name) => name.startsWith('$ACTION_'))) throw new Error('Formulário sem ação reconhecida.');
  return data;
}

async function main() {
  const databaseUrl = checkDestination();
  const bytes = {};
  for (const example of examples) {
    bytes[example.template] = [];
    for (let index = 0; index < 3; index++) {
      const file = await readFile(path.join(source, `${example.template}-${index + 1}.jpg`));
      if (createHash('sha256').update(file).digest('hex') !== files[example.template][index]) throw new Error(`Imagem ${example.template}-${index + 1} não corresponde à fonte documentada.`);
      bytes[example.template].push(file);
    }
  }
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  let cookie = '';
  async function get(route) {
    const response = await fetch(origin + route, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
    const html = await response.text();
    if (response.status !== 200) throw new Error(`Falha ao acessar ${route}: ${response.status}.`);
    return html;
  }
  async function post(route, data, expected) {
    const response = await fetch(origin + route, { method: 'POST', headers: { origin, referer: origin + route, ...(cookie ? { cookie } : {}) }, body: data, redirect: 'manual' });
    for (const header of response.headers.getSetCookie()) {
      const found = header.match(/^(wedding-session=[^;]+)/);
      if (found && !found[1].endsWith('=')) cookie = found[1];
    }
    const location = response.headers.get('location') ?? '';
    if (response.status !== 303 || !expected.test(location)) throw new Error(`Ação em ${route} não foi concluída (${response.status}).`);
    return location;
  }
  try {
    await db.$connect();
    const account = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!account) throw new Error('Conta W-005 não encontrada no banco confirmado.');
    // A session created by this server must exist in the exact confirmed database.
    const login = formData(forms(await get('/entrar'))[0]);
    login.set('email', email); login.set('password', process.env.DEMO_PASSWORD);
    await post('/entrar', login, /^\/painel$/);
    const token = cookie.slice('wedding-session='.length);
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Sessão de demonstração inválida.');
    const session = await db.session.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') }, select: { userId: true, expiresAt: true } });
    if (!session || session.userId !== account.id || session.expiresAt <= new Date()) throw new Error('A aplicação não está conectada ao banco de demonstração confirmado.');

    for (const example of examples) {
      const slug = `demo-c007-${example.template}`;
      const prior = await db.wedding.findUnique({ where: { slug }, select: { id: true, ownerId: true, draft: true, publishedRevisionId: true } });
      if (prior) {
        if (prior.ownerId !== account.id) throw new Error(`O endereço ${slug} pertence a outra conta; nenhuma alteração foi feita nele.`);
        console.log(`${example.template}: já existe; preservado. Prévia: ${origin}/painel/${prior.id}/previa`);
        if (!Array.isArray(prior.draft?.photoIds) || prior.draft.photoIds.length < 3 || !prior.publishedRevisionId) {
          console.warn(`${example.template}: exemplo incompleto ou editado; confira manualmente, sem sobrescrita automática.`);
        }
        continue;
      }
      const create = formData(forms(await get('/painel/novo'))[0]);
      create.set('coupleNames', example.names); create.set('slug', slug);
      const created = await post('/painel/novo', create, /^\/painel\/[^?]+\?estado=criado$/);
      const id = created.match(/^\/painel\/([^?]+)/)[1];
      const owned = await db.wedding.findFirst({ where: { id, ownerId: account.id, slug }, select: { id: true } });
      if (!owned) throw new Error('Casamento criado não corresponde ao banco e à conta confirmados.');
      const route = `/painel/${id}`;
      const edit = forms(await get(route)).find((form) => form.includes('name="template"'));
      if (!edit) throw new Error('Formulário de edição não encontrado.');
      const draft = formData(edit);
      draft.set('template', example.template); draft.set('coupleNames', example.names); draft.set('eventDate', example.date);
      draft.set('eventLocation', example.location); draft.set('welcomeMessage', example.welcome); draft.set('story', example.story);
      await post(route, draft, /\?estado=salvo$/);
      for (let index = 0; index < 3; index++) {
        const upload = forms(await get(route)).find((form) => form.includes('name="photo"'));
        if (!upload) throw new Error('Formulário de fotografia não encontrado.');
        const data = formData(upload);
        data.set('photo', new Blob([bytes[example.template][index]], { type: 'image/jpeg' }), `${example.template}-${index + 1}.jpg`);
        await post(route, data, /\?estado=foto-adicionada$/);
      }
      const current = await db.wedding.findFirst({ where: { id, ownerId: account.id }, select: { draft: true } });
      if (!current || !Array.isArray(current.draft.photoIds) || current.draft.photoIds.length !== 3) throw new Error('As três fotografias não foram associadas ao rascunho.');
      const html = await get(route);
      const publish = forms(html).find((form) => form.includes('Publicar site'));
      if (!publish) throw new Error('Formulário de publicação não encontrado.');
      await post(route, formData(publish), /\?estado=publicado$/);
      await get(`${route}/previa`);
      console.log(`${example.template}: criado com três fotos. Prévia: ${origin}${route}/previa`);
    }
  } finally { await db.$disconnect(); }
}

main().catch((error) => { console.error(`Demonstração interrompida: ${error.message}`); process.exitCode = 1; });
