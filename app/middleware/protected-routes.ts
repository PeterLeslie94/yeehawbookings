import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function protectedRouteMiddleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Allow OPTIONS requests without authentication
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/booking', '/about', '/contact', '/packages'];
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password'];
  
  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  const isAuthRoute = authRoutes.some(route => pathname === route);

  // Redirect authenticated users away from auth pages
  if (token && isAuthRoute) {
    const redirectUrl = token.role === 'ADMIN' ? '/admin/dashboard' : '/';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Allow public routes
  if (isPublicRoute || isAuthRoute) {
    return NextResponse.next();
  }

  // Protected route checks
  const isAdminRoute = pathname.startsWith('/admin');
  const isAccountRoute = pathname.startsWith('/account');
  const isApiRoute = pathname.startsWith('/api');

  // Handle unauthenticated access
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle admin routes
  if (isAdminRoute) {
    if (token.role !== 'ADMIN') {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Handle admin API routes
  if (pathname.startsWith('/api/admin') && token.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}