import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));
vi.mock('../src/app/cadastro/actions', () => ({ signup: vi.fn() }));
vi.mock('../src/app/entrar/actions', () => ({ login: vi.fn() }));

import CadastroPage from '../src/app/cadastro/page';
import EntrarPage from '../src/app/entrar/page';

const props = { searchParams: Promise.resolve({}) };
const configNames = [
  'NOIVARA_HOMOLOGACAO', 'NOIVARA_HOMOLOG_USUARIO',
  'NOIVARA_HOMOLOG_SENHA', 'NOIVARA_HOMOLOG_USUARIO_2', 'NOIVARA_HOMOLOG_SENHA_2', 'NOIVARA_HOMOLOG_CONTA_ID', 'APP_URL',
];

describe('navegação de cadastro e entrada', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('RENDER', 'false');
    for (const name of configNames) vi.stubEnv(name, '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('preserva o formulário e o link de cadastro no modo normal', async () => {
    const signup = renderToStaticMarkup(await CadastroPage(props));
    const login = renderToStaticMarkup(await EntrarPage(props));
    expect(signup).toContain('Meu Casamento');
    expect(login).toContain('Meu Casamento');
    expect(signup).toContain('Criar conta');
    expect(signup).toContain('name="password"');
    expect(login).toContain('href="/cadastro"');
  });

  it('direciona cadastro para entrada e oculta o link na homologação', async () => {
    vi.stubEnv('NOIVARA_HOMOLOGACAO', '1');
    vi.stubEnv('NOIVARA_HOMOLOG_USUARIO', 'a'.repeat(32));
    vi.stubEnv('NOIVARA_HOMOLOG_SENHA', 'synthetic-test-password-0123456789');
    vi.stubEnv('NOIVARA_HOMOLOG_USUARIO_2', 'b'.repeat(32));
    vi.stubEnv('NOIVARA_HOMOLOG_SENHA_2', 'synthetic-second-password-987654321');
    vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', 'demo_account');
    vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
    await expect(CadastroPage(props)).rejects.toThrow('REDIRECT:/entrar');
    const login = renderToStaticMarkup(await EntrarPage(props));
    expect(login).toContain('name="password"');
    expect(login).not.toContain('href="/cadastro"');
  });

  it('também oculta o cadastro se a configuração declarada estiver incompleta', async () => {
    vi.stubEnv('NOIVARA_HOMOLOGACAO', '1');
    await expect(CadastroPage(props)).rejects.toThrow('REDIRECT:/entrar');
    expect(renderToStaticMarkup(await EntrarPage(props))).not.toContain('href="/cadastro"');
  });
});
