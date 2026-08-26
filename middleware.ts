import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/access', '/api/access-gate/unlock'];

export function middleware(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0].toLowerCase();
  const configuredPublicHost = (process.env.MTG_PUBLIC_HOST || '').toLowerCase();

  // Local Umbrel/LAN access remains the trusted administration surface.
  if (!configuredPublicHost || host !== configuredPublicHost) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path)) || pathname.startsWith('/_next/') || pathname === '/favicon.ico') return NextResponse.next();

  // Never expose host-only remote configuration endpoints through the public hostname.
  if (pathname.startsWith('/api/remote-access') || pathname.startsWith('/api/access-gate')) {
    return NextResponse.json({ error: 'This setting is available from the local Umbrel app only.' }, { status: 403 });
  }

  const expected = process.env.MTG_ACCESS_SESSION || '';
  const actual = request.cookies.get('mtg_public_access')?.value || '';
  if (expected && actual === expected) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/access';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
