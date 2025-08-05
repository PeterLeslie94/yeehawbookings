import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/booking/new', '/account']
const adminRoutes = ['/admin']

// Routes that are always public
const publicRoutes = ['/', '/about', '/contact', '/auth/login', '/auth/signup', '/auth/error']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route requires protection
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  )
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith('/api/auth')
  )

  // Skip auth check for public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Get the token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Redirect to login if accessing protected route without auth
  if ((isProtectedRoute || isAdminRoute) && !token) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Check admin role for admin routes
  if (isAdminRoute && token?.role !== 'ADMIN') {
    return new NextResponse('Forbidden - Admin access required', { 
      status: 403 
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}