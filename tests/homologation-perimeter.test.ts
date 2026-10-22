import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/homologation-rate-limit', () => ({
  limitHomologationBasic: vi.fn(() => ({ state: 'ok' })),
}));
import { limitHomologationBasic } from '@/lib/homologation-rate-limit';
import * as proxyModule from '../src/proxy';
const { proxy } = proxyModule;

// Synthetic fixtures: real identifiers and passwords must be random and private.
const firstUser = 'a'.repeat(32);
const secondUser = 'b'.repeat(32);
const firstSecret = 'SYNTHETIC-test-password-00000001';
const secondSecret = 'SYNTHETIC-test-password-00000002';
const basic = (user: string, password: string) => 'Basic ' + Buffer.from(user + ':' + password).toString('base64');
const firstBasic = basic(firstUser, firstSecret);
const secondBasic = basic(secondUser, secondSecret);
const env = [
  'NOIVARA_HOMOLOGACAO', 'NOIVARA_HOMOLOG_USUARIO', 'NOIVARA_HOMOLOG_SENHA',
  'NOIVARA_HOMOLOG_USUARIO_2', 'NOIVARA_HOMOLOG_SENHA_2', 'NOIVARA_HOMOLOG_CONTA_ID',
] as const;

function enable() {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
  vi.stubEnv('NOIVARA_HOMOLOGACAO', '1');
  vi.stubEnv('NOIVARA_HOMOLOG_USUARIO', firstUser);
  vi.stubEnv('NOIVARA_HOMOLOG_SENHA', firstSecret);
  vi.stubEnv('NOIVARA_HOMOLOG_USUARIO_2', secondUser);
  vi.stubEnv('NOIVARA_HOMOLOG_SENHA_2', secondSecret);
  vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', 'demo_account');
}

describe('perímetro de homologação', () => {
  beforeEach(() => {
    env.forEach(name => vi.stubEnv(name, ''));
    vi.mocked(limitHomologationBasic).mockReset().mockReturnValue({ state: 'ok' });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('preserva o comportamento normal quando o modo e suas configurações estão ausentes', () => {
    const response = proxy(new NextRequest('http://localhost:3000/s/example'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('www-authenticate')).toBeNull();
  });

  it.each([
    '/', '/entrar', '/cadastro', '/painel/abc', '/painel/abc/recebimentos/demonstracao', '/s/example', '/fotos/id',
    '/imagens-presente/id', '/icon.svg', '/icon.svg?icon.test', '/images/noivara-casal.webp', '/_next/static/chunks/main.js',
    '/_next/image?url=%2Fimages%2Fphoto.png&w=640&q=75',
  ])('exige credenciais também em %s sem consumir tentativas', path => {
    enable();
    const config = (proxyModule as { config?: { matcher?: string } }).config ?? {};
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path })).toBe(true);
    const response = proxy(new NextRequest('http://localhost:3000' + path));
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Basic realm="Meu Casamento homologacao", charset="UTF-8"');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(limitHomologationBasic).not.toHaveBeenCalled();
  });

  it('não usa nomes desconhecidos ou cabeçalhos internos falsificados para consumir um bucket', () => {
    enable();
    for (const authorization of ['Basic Zm9yZ2Vk', basic('f'.repeat(32), firstSecret), 'Bearer forged']) {
      const request = new NextRequest('http://localhost:3000/painel/abc', {
        method: 'POST', headers: {
          authorization, 'x-forwarded-for': '127.0.0.1',
          'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware',
          'x-middleware-next': '1', 'x-matched-path': '/',
        },
      });
      expect(proxy(request).status).toBe(401);
    }
    expect(limitHomologationBasic).not.toHaveBeenCalled();
  });

  it('atribui cada falha ao identificador reconhecido sem aceitar senhas cruzadas', () => {
    enable();
    for (const [slot, user, password] of [
      [0, firstUser, secondSecret], [1, secondUser, firstSecret],
      [0, firstUser, 'SYNTHETIC-wrong-password-0000001'],
      [1, secondUser, 'SYNTHETIC-wrong-password-0000002'],
    ] as const) {
      vi.mocked(limitHomologationBasic).mockClear();
      const response = proxy(new NextRequest('https://example.onrender.com/painel', {
        headers: { authorization: basic(user, password) },
      }));
      expect(response.status).toBe(401);
      expect(limitHomologationBasic).toHaveBeenCalledTimes(1);
      expect(limitHomologationBasic).toHaveBeenCalledWith(slot, true);
    }
  });

  it('recusa um Basic em base64 não canônico mesmo quando decodifica para o par correto', () => {
    enable();
    // Two unused low bits in the last base64 character can encode the same bytes.
    const token = firstBasic.slice('Basic '.length);
    expect(token.endsWith('=') && !token.endsWith('==')).toBe(true);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const index = token.length - 2;
    const variant = token.slice(0, index) + alphabet[alphabet.indexOf(token[index]) + 1] + token.slice(index + 1);
    expect(Buffer.from(variant, 'base64').equals(Buffer.from(token, 'base64'))).toBe(true);
    const response = proxy(new NextRequest('https://example.onrender.com/', { headers: { authorization: 'Basic ' + variant } }));
    expect(response.status).toBe(401);
  });

  it.each([
    [0, firstBasic, 'https://demo.example.test/_next/static/chunks/main.js'],
    [1, secondBasic, 'https://example.onrender.com/fotos/id'],
  ])('permite o par %i no host e impede cache compartilhado', (slot, authorization, url) => {
    enable();
    const response = proxy(new NextRequest(url, { headers: { authorization } }));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toContain('Authorization');
    expect(limitHomologationBasic).toHaveBeenCalledWith(slot, false);
  });

  it('desativa o otimizador de imagens na homologação para evitar cache público', () => {
    enable();
    const response = proxy(new NextRequest('https://example.onrender.com/_next/image?url=%2Ficon.svg&w=640&q=75', {
      headers: { authorization: secondBasic },
    }));
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(limitHomologationBasic).toHaveBeenCalledWith(1, false);
  });

  it('bloqueia credenciais corretas do bucket esgotado com resposta genérica em qualquer host', async () => {
    enable();
    vi.mocked(limitHomologationBasic).mockReturnValue({ state: 'blocked', retryAfterSeconds: 42 });
    const unknown = proxy(new NextRequest('https://demo.example.test/', {
      headers: { authorization: basic('f'.repeat(32), firstSecret) },
    }));
    const unknownBody = await unknown.text();
    for (const [url, authorization, slot] of [
      ['https://demo.example.test/fotos/id', firstBasic, 0],
      ['https://example.onrender.com/_next/static/chunks/main.js', secondBasic, 1],
      ['https://other.example.test/entrar', basic(firstUser, secondSecret), 0],
    ] as const) {
      vi.mocked(limitHomologationBasic).mockClear();
      const response = proxy(new NextRequest(url, { headers: { authorization, 'x-forwarded-for': '127.0.0.1' } }));
      expect(response.status).toBe(401);
      expect(await response.text()).toBe(unknownBody);
      expect(response.headers.get('www-authenticate')).toBe(unknown.headers.get('www-authenticate'));
      expect(response.headers.get('retry-after')).toBeNull();
      expect(response.headers.get('cache-control')).toContain('no-store');
      expect(limitHomologationBasic).toHaveBeenCalledWith(slot, authorization !== firstBasic && authorization !== secondBasic);
    }
  });

  it('falha fechado sem expor credenciais quando o armazenamento está indisponível', async () => {
    enable();
    vi.mocked(limitHomologationBasic).mockReturnValue({ state: 'unavailable' });
    const response = proxy(new NextRequest('https://example.onrender.com/painel', { headers: { authorization: firstBasic } }));
    expect(response.status).toBe(503);
    const responseBody = await response.text();
    expect(responseBody).not.toContain(firstSecret);
    expect(responseBody).not.toContain(firstUser);
    expect([...response.headers.values()].join(' ')).not.toContain(firstBasic);

    vi.mocked(limitHomologationBasic).mockClear();
    const unknown = proxy(new NextRequest('https://example.onrender.com/painel', {
      headers: { authorization: basic('f'.repeat(32), firstSecret) },
    }));
    expect(unknown.status).toBe(401);
    expect(limitHomologationBasic).not.toHaveBeenCalled();
  });

  it('falha fechado com modo ou qualquer um dos pares incompletos ou inválidos', () => {
    vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', 'demo_account');
    expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(503);
    for (const [name, value] of [
      ['NOIVARA_HOMOLOGACAO', 'true'], ['NOIVARA_HOMOLOG_SENHA', ''],
      ['NOIVARA_HOMOLOG_USUARIO_2', ''], ['NOIVARA_HOMOLOG_SENHA_2', ''],
      ['NOIVARA_HOMOLOG_USUARIO', 'viewer'], ['NOIVARA_HOMOLOG_USUARIO_2', 'A'.repeat(32)],
      ['NOIVARA_HOMOLOG_USUARIO_2', firstUser], ['NOIVARA_HOMOLOG_SENHA_2', firstSecret],
      ['NOIVARA_HOMOLOG_USUARIO_2', secondUser + '\n'],
    ] as const) {
      enable();
      vi.stubEnv(name, value);
      expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(503);
    }
  });

  it('falha fechado no Render em produção mesmo sem nenhuma variável de homologação', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RENDER', 'true');
    expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(503);
    vi.stubEnv('RENDER', '');
    expect(proxy(new NextRequest('http://localhost:3000/')).headers.get('x-middleware-next')).toBe('1');
  });

  it('exige origem HTTPS em produção e loopback durante testes locais', () => {
    enable();
    vi.stubEnv('NODE_ENV', 'production');
    expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(503);
    vi.stubEnv('APP_URL', 'https://demo.example.test');
    expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(401);
    vi.stubEnv('NODE_ENV', 'test');
    expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(503);
  });
});
