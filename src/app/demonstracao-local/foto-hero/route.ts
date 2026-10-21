import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

/** The server itself must also bind to loopback; Host alone is not an access control. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development' || !localHost.test(request.headers.get('host') ?? '')) {
    return new Response(null, { status: 404, headers });
  }

  try {
    const file = path.join(process.cwd(), '.local-media', 'c008-landing', 'noivara-casal.webp');
    const bytes = await readFile(file);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': 'image/webp' } });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
