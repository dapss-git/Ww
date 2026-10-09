import { NextRequest, NextResponse } from 'next/server';

const USER_COOKIE = 'ww_session';
const OWNER_COOKIE = 'ww_owner';

const PROTECTED_USER_PAGES = ['/lobby', '/room', '/game'];

/**
 * Middleware edge: gerbang cepat berbasis keberadaan cookie.
 * Otorisasi sebenarnya SELALU diverifikasi ulang di server (guards + database session).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasUser = Boolean(req.cookies.get(USER_COOKIE)?.value);
  const hasOwner = Boolean(req.cookies.get(OWNER_COOKIE)?.value);

  if (pathname.startsWith('/owner')) {
    const isLogin = pathname === '/owner/login' || pathname.startsWith('/owner/login/');
    if (!isLogin && !hasOwner) {
      if (hasUser) {
        return new NextResponse(
          '<!doctype html><meta charset="utf-8"><title>403 FORBIDDEN</title><body style="background:#08090D;color:#F1F1F4;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1>403 FORBIDDEN</h1><p>You do not have permission to perform this action.</p></div></body>',
          { status: 403, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' } },
        );
      }
      return NextResponse.redirect(new URL('/owner/login', req.url));
    }
    const res = NextResponse.next();
    res.headers.set('x-robots-tag', 'noindex, nofollow');
    res.headers.set('cache-control', 'no-store');
    return res;
  }

  if (PROTECTED_USER_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !hasUser) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/api/owner') && !pathname.startsWith('/api/owner/auth/login') && !hasOwner) {
    return NextResponse.json(
      { success: false, error: { code: hasUser ? 'FORBIDDEN' : 'UNAUTHORIZED', message: hasUser ? 'You do not have permission to perform this action.' : 'Silakan login sebagai owner.' } },
      { status: hasUser ? 403 : 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/lobby/:path*', '/room/:path*', '/game/:path*', '/owner/:path*', '/api/owner/:path*'],
};
