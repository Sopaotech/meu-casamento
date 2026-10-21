import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock('node:fs/promises', () => ({ readFile }));

import { GET } from '../src/app/demonstracao-local/foto-hero/route';

function request(host: string) {
  return new Request('http://127.0.0.1/demonstracao-local/foto-hero', { headers: { host } });
}

afterEach(() => {
  vi.unstubAllEnvs();
  readFile.mockReset();
});

describe('local landing photo', () => {
  it('serves the original only in development for a local host', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    readFile.mockResolvedValue(Buffer.from([1, 2, 3]));
    const response = await GET(request('127.0.0.1:3000'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(readFile).toHaveBeenCalledWith(path.join(process.cwd(), '.local-media', 'c008-landing', 'noivara-casal.webp'));
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it.each(['production', 'test'])('returns 404 in %s', async (environment) => {
    vi.stubEnv('NODE_ENV', environment);
    expect((await GET(request('localhost:3000'))).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each(['example.com', 'localhost.example.com', '127.0.0.1.example.com'])('rejects a non-local host %s', async (host) => {
    vi.stubEnv('NODE_ENV', 'development');
    expect((await GET(request(host))).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it('returns 404 when the file is missing', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    readFile.mockRejectedValue(new Error('missing'));
    expect((await GET(request('localhost:3000'))).status).toBe(404);
  });
});
