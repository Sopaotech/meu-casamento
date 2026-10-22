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

const secret = 'SYNTHETIC-test-password-0123456789';
const basic = `Basic ${Buffer.from(`viewer:${secret}`).toString('base64')}`;
const env = ['NOIVARA_HOMOLOGACAO', 'NOIVARA_HOMOLOG_USUARIO', 'NOIVARA_HOMOLOG_SENHA', 'NOIVARA_HOMOLOG_CONTA_ID'] as const;

function enable() {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
  vi.stubEnv('NOIVARA_HOMOLOGACAO', '1');
  vi.stubEnv('NOIVARA_HOMOLOG_USUARIO', 'viewer');
  vi.stubEnv('NOIVARA_HOMOLOG_SENHA', secret);
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
  ])('exige credenciais também em %s', path => {
    enable();
    const config = (proxyModule as { config?: { matcher?: string } }).config ?? {};
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path })).toBe(true);
    const response = proxy(new NextRequest(`http://localhost:3000${path}`));
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Basic realm="Meu Casamento homologacao", charset="UTF-8"');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(limitHomologationBasic).not.toHaveBeenCalled();
  });

  it('não aceita senha errada, cabeçalhos internos falsificados ou POST direto', () => {
    enable();
    const request = new NextRequest('http://localhost:3000/painel/abc', {
      method: 'POST', headers: {
        authorization: 'Basic Zm9yZ2Vk',
        'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware',
        'x-middleware-next': '1', 'x-matched-path': '/',
      },
    });
    expect(proxy(request).status).toBe(401);
    expect(limitHomologationBasic).toHaveBeenCalledWith(true);
  });

  it('permite o acesso com credenciais corretas e impede cache compartilhado', () => {
    enable();
    const response = proxy(new NextRequest('http://localhost:3000/_next/static/chunks/main.js', { headers: { authorization: basic } }));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toContain('Authorization');
    expect(limitHomologationBasic).toHaveBeenCalledWith(false);
  });

  it('desativa o otimizador de imagens na homologação para evitar cache público', () => {
    enable();
    const response = proxy(new NextRequest('https://example.onrender.com/_next/image?url=%2Ficon.svg&w=640&q=75', {
      headers: { authorization: basic },
    }));
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(limitHomologationBasic).toHaveBeenCalledWith(false);
  });

  it('aplica o mesmo bloqueio a credenciais corretas e incorretas em qualquer host e asset', () => {
    enable();
    vi.mocked(limitHomologationBasic).mockReturnValue({ state: 'blocked', retryAfterSeconds: 42 });
    for (const [url, authorization] of [
      ['https://demo.example.test/fotos/id', basic],
      ['https://example.onrender.com/_next/static/chunks/main.js', 'Basic Zm9yZ2Vk'],
      ['https://other.example.test/entrar', basic],
    ]) {
      const response = proxy(new NextRequest(url, { headers: { authorization, 'x-forwarded-for': '127.0.0.1' } }));
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('42');
      expect(response.headers.get('cache-control')).toContain('no-store');
    }
  });

  it('falha fechado sem expor credenciais quando o armazenamento do limite está indisponível', async () => {
    enable();
    vi.mocked(limitHomologationBasic).mockReturnValue({ state: 'unavailable' });
    const response = proxy(new NextRequest('https://example.onrender.com/painel', { headers: { authorization: basic } }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(secret);
    expect([...response.headers.values()].join(' ')).not.toContain(basic);
  });

  it('falha fechado para switch ausente com configuração parcial, switch inválido e segredos incompletos', () => {
    vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', 'demo_account');
    expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(503);
    enable();
    vi.stubEnv('NOIVARA_HOMOLOGACAO', 'true');
    expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(503);
    enable();
    vi.stubEnv('NOIVARA_HOMOLOG_SENHA', '');
    expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(503);
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
