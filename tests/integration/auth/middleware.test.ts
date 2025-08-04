import { NextRequest } from 'next/server'
import { withAuth } from '@/app/lib/auth/middleware'
import { getToken } from 'next-auth/jwt'

// Mock next-auth
jest.mock('next-auth/jwt')
const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>

describe('Authentication Middleware', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock request
    mockRequest = {
      nextUrl: { pathname: '/test' },
      cookies: { get: jest.fn() }
    } as any
  })

  describe('Protected Routes', () => {
    it('should allow authenticated users to access protected routes', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce({
        sub: 'user-id',
        email: 'user@example.com',
        role: 'CUSTOMER'
      } as any)

      // Act
      const middleware = withAuth((req) => {
        return new Response('Authorized', { status: 200 })
      })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('Authorized')
    })

    it('should redirect unauthenticated users to login', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce(null)
      mockRequest.nextUrl.pathname = '/dashboard'

      // Act
      const middleware = withAuth((req) => {
        return new Response('Authorized', { status: 200 })
      })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/auth/login')
    })

    it('should include return URL when redirecting', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce(null)
      mockRequest.nextUrl.pathname = '/booking/new'

      // Act
      const middleware = withAuth((req) => {
        return new Response('Authorized', { status: 200 })
      })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(302)
      const location = response.headers.get('location')
      expect(location).toContain('/auth/login')
      expect(location).toContain('callbackUrl=%2Fbooking%2Fnew')
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin routes', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce({
        sub: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN'
      } as any)
      mockRequest.nextUrl.pathname = '/admin/dashboard'

      // Act
      const middleware = withAuth((req) => {
        return new Response('Admin Access', { status: 200 })
      }, { requiredRole: 'ADMIN' })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('Admin Access')
    })

    it('should deny customer access to admin routes', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce({
        sub: 'user-id',
        email: 'user@example.com',
        role: 'CUSTOMER'
      } as any)
      mockRequest.nextUrl.pathname = '/admin/dashboard'

      // Act
      const middleware = withAuth((req) => {
        return new Response('Admin Access', { status: 200 })
      }, { requiredRole: 'ADMIN' })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Insufficient permissions')
    })

    it('should handle missing role in token', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce({
        sub: 'user-id',
        email: 'user@example.com'
        // No role field
      } as any)
      mockRequest.nextUrl.pathname = '/admin/dashboard'

      // Act
      const middleware = withAuth((req) => {
        return new Response('Admin Access', { status: 200 })
      }, { requiredRole: 'ADMIN' })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(403)
    })
  })

  describe('Public Routes', () => {
    const publicRoutes = ['/', '/about', '/contact', '/auth/login', '/auth/signup']

    publicRoutes.forEach(route => {
      it(`should allow unauthenticated access to ${route}`, async () => {
        // Arrange
        mockedGetToken.mockResolvedValueOnce(null)
        mockRequest.nextUrl.pathname = route

        // Act - Middleware should not protect public routes
        const middleware = withAuth((req) => {
          return new Response('Public Access', { status: 200 })
        }, { publicRoutes })
        const response = await middleware(mockRequest)

        // Assert
        expect(response.status).toBe(200)
        expect(await response.text()).toBe('Public Access')
      })
    })
  })

  describe('API Routes Protection', () => {
    it('should protect API routes with authentication', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce(null)
      mockRequest.nextUrl.pathname = '/api/bookings'

      // Act
      const middleware = withAuth((req) => {
        return new Response(JSON.stringify({ bookings: [] }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Authentication required')
    })

    it('should allow authenticated API access', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce({
        sub: 'user-id',
        email: 'user@example.com',
        role: 'CUSTOMER'
      } as any)
      mockRequest.nextUrl.pathname = '/api/bookings'

      // Act
      const middleware = withAuth((req) => {
        return new Response(JSON.stringify({ bookings: [] }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.bookings).toBeDefined()
    })
  })

  describe('Session Expiry', () => {
    it('should redirect if token is expired', async () => {
      // Arrange
      mockedGetToken.mockResolvedValueOnce({
        sub: 'user-id',
        email: 'user@example.com',
        role: 'CUSTOMER',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      } as any)
      mockRequest.nextUrl.pathname = '/dashboard'

      // Act
      const middleware = withAuth((req) => {
        return new Response('Authorized', { status: 200 })
      })
      const response = await middleware(mockRequest)

      // Assert
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/auth/login')
    })
  })
})