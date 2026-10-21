import { NextResponse, type NextRequest } from 'next/server';
import { homologationAccess } from '@/lib/homologation';

// No matcher: Next.js runs this on every route, public file, and _next asset.
export function proxy(request: NextRequest) {
  const access = homologationAccess(request.headers.get('authorization'));
  if (access === 'disabled') return NextResponse.next();
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization' };
  if (access === 'invalid') return new NextResponse('Homologação indisponível.', { status: 503, headers });
  if (access === 'denied') return new NextResponse('Autenticação necessária.', {
    status: 401, headers: { ...headers, 'WWW-Authenticate': 'Basic realm="Meu Casamento homologacao", charset="UTF-8"' },
  });
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}
