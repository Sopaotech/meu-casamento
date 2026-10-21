import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const args = ['scripts/prepare-c010-demo.mjs', '--confirm-db=wedding_c010_demo_test'];
const good = {
  ...process.env,
  NODE_ENV: 'development' as const,
  DEMO_APP_URL: 'http://127.0.0.1:3113',
  DEMO_DATABASE_URL: 'postgresql://c010_demo:test-only@127.0.0.1:55445/wedding_c010_demo_test?schema=public',
  DEMO_PASSWORD: 'senha-ficticia-c010',
};

describe('proteção da rotina de demonstração C-010', () => {
  it.each([
    [{ NODE_ENV: 'production' as const }, 'NODE_ENV'],
    [{ DEMO_APP_URL: 'http://127.0.0.1:3104' }, 'DEMO_APP_URL'],
    [{ DEMO_DATABASE_URL: 'postgresql://c010_demo:abc@127.0.0.1:55443/wedding_w004_test?schema=public' }, 'Banco não corresponde'],
    [{ DEMO_DATABASE_URL: 'postgresql://c010_demo:abc@localhost:55445/wedding_c010_demo_test?schema=public' }, 'Banco não corresponde'],
    [{ DEMO_DATABASE_URL: 'postgresql://outro:abc@127.0.0.1:55445/wedding_c010_demo_test?schema=public' }, 'Banco não corresponde'],
    [{ DEMO_DATABASE_URL: 'postgresql://c010_demo:abc@127.0.0.1:55445/wedding_c010_demo_test?schema=public&host=outro' }, 'Banco não corresponde'],
    [{ DEMO_PASSWORD: 'curta' }, 'senha fictícia'],
  ])('recusa configuração fora do destino permitido', (change, message) => {
    const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: { ...good, ...change }, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(message);
  });

  it('exige confirmação explícita do banco', () => {
    const result = spawnSync(process.execPath, [args[0]], { cwd: process.cwd(), env: good, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Confirme o destino');
  });
});
