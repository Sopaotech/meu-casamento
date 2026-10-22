import { NextResponse, type NextRequest } from 'next/server';
import { homologationAccess } from '@/lib/homologation';
import { limitHomologationBasic } from '@/lib/homologation-rate-limit';

// No matcher: Next.js runs this on every route, public file, and _next asset.
export function proxy(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const access = homologationAccess(authorization);
  if (access === 'disabled') return NextResponse.next();
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization' };
  if (access === 'invalid') return new NextResponse('Homologação indisponível.', { status: 503, headers });

  // No credentials means no password guess. Every request carrying credentials,
  // including valid credentials and assets, must respect a shared lockout.
  if (authorization !== null) {
    const limit = limitHomologationBasic(access === 'denied');
    if (limit.state === 'unavailable') return new NextResponse('Homologação indisponível.', { status: 503, headers });
    if (limit.state === 'blocked') return new NextResponse('Muitas tentativas. Tente novamente mais tarde.', {
      status: 429, headers: { ...headers, 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  if (access === 'denied') return new NextResponse('Autenticação necessária.', {
    status: 401, headers: { ...headers, 'WWW-Authenticate': 'Basic realm="Meu Casamento homologacao", charset="UTF-8"' },
  });

  // The app does not use Next Image Optimization. Its handler can overwrite
  // the perimeter's private cache headers, so it is unavailable in this mode.
  if (request.nextUrl.pathname.startsWith('/_next/image')) {
    return new NextResponse(null, { status: 404, headers });
  }

  const response = NextResponse.next();
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}
