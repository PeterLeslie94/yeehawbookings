import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { UserRole } from '@prisma/client'

export interface AuthMiddlewareOptions {
  requiredRole?: UserRole
  publicRoutes?: string[]
}

export function withAuth(
  handler: (request: NextRequest) => Promise<Response> | Response,
  options: AuthMiddlewareOptions = {}
) {
  return async function middleware(request: NextRequest) {
    const { requiredRole, publicRoutes = [] } = options
    const pathname = request.nextUrl.pathname

    // Check if route is public
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    )

    if (isPublicRoute) {
      return handler(request)
    }

    // Get token
    const token = await getToken({ 
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET 
    })

    // Check if user is authenticated
    if (!token) {
      // API routes return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Pages redirect to login
      const url = new URL('/auth/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Check token expiry
    if (token.exp && Date.now() / 1000 > token.exp) {
      // API routes return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }

      // Pages redirect to login
      const url = new URL('/auth/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Check role if required
    if (requiredRole && token.role !== requiredRole) {
      // API routes return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Pages show forbidden
      return new NextResponse('Forbidden - Insufficient permissions', { 
        status: 403 
      })
    }

    // All checks passed, proceed with request
    return handler(request)
  }
}