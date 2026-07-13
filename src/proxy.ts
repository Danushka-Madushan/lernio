import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that bypass authentication checks
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/favicon.ico');

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // Paths requiring NO active session (e.g., login page)
  const isAuthPage = pathname === '/login';

  const token = request.cookies.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  // If trying to access login page while already authenticated, redirect to home
  if (isAuthPage) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If not authenticated, redirect to login (or return 401 for API)
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routing check
  if (pathname.startsWith('/admin')) {
    if (user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth/login (handled in code explicitly or omitted)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
