import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // Bypass: static assets & Next.js internals
  if (
    cleanPath.startsWith('/_next') ||
    cleanPath === '/icon.svg' ||
    cleanPath === '/favicon.ico' ||
    cleanPath === '/auth-back.jpg'
  ) {
    return NextResponse.next();
  }

  // Bypass: public authentication endpoints (login and logout)
  if (cleanPath === '/api/auth/login' || cleanPath === '/api/auth/logout') {
    return NextResponse.next();
  }

  const isLoginPage = cleanPath === '/login';
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
    if (cleanPath.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---- Staff routes (/admin) ----
  if (cleanPath.startsWith('/admin')) {
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      // Non-staff visiting /admin → redirect to student feed
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Teachers cannot access teacher management
    if (cleanPath.startsWith('/admin/teachers') && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/videos', request.url));
    }
  }

  // ---- Staff sub-routes in exams portal (/exams-portal/groups, /exams-portal/exams/[id]/marks) ----
  if (
    (cleanPath.startsWith('/exams-portal/groups') || cleanPath.endsWith('/marks')) &&
    user.role !== 'ADMIN' &&
    user.role !== 'TEACHER'
  ) {
    return NextResponse.redirect(new URL('/exams-portal', request.url));
  }

  return NextResponse.next();
}

export { proxy as middleware };

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.png$).*)',
  ],
};
