import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass: static assets & Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icon.svg') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/auth-back.jpg') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Bypass: the login API route itself
  if (pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  const isLoginPage = pathname === '/login';
  const token = request.cookies.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  // ---- Authenticated users on login page → redirect to home ----
  if (isLoginPage) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // ---- Unauthenticated → redirect to login ----
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---- Staff routes (/admin) ----
  if (pathname.startsWith('/admin')) {
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      // Non-staff visiting /admin → redirect to student feed
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Teachers cannot access teacher management
    if (pathname.startsWith('/admin/teachers') && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/videos', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.png$).*)',
  ],
};
