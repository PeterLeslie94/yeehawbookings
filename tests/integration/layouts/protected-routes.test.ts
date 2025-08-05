import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { protectedRouteMiddleware } from '@/app/middleware/protected-routes';

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

describe('Protected Routes Integration', () => {
  const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
  
  const createMockRequest = (url: string, headers: Record<string, string> = {}) => {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      headers: new Headers(headers),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Routes', () => {
    it('should allow access to home page without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const request = createMockRequest('/');
      const response = await protectedRouteMiddleware(request);
      
      expect(response).toBe(NextResponse.next());
    });

    it('should allow access to booking page without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const request = createMockRequest('/booking');
      const response = await protectedRouteMiddleware(request);
      
      expect(response).toBe(NextResponse.next());
    });

    it('should allow access to auth pages without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const loginRequest = createMockRequest('/auth/login');
      const signupRequest = createMockRequest('/auth/signup');
      
      const loginResponse = await protectedRouteMiddleware(loginRequest);
      const signupResponse = await protectedRouteMiddleware(signupRequest);
      
      expect(loginResponse).toBe(NextResponse.next());
      expect(signupResponse).toBe(NextResponse.next());
    });
  });

  describe('Customer Protected Routes', () => {
    it('should allow authenticated customers to access account pages', async () => {
      mockGetToken.mockResolvedValue({
        email: 'customer@example.com',
        role: 'CUSTOMER',
        sub: 'user-id',
      });
      
      const request = createMockRequest('/account/bookings');
      const response = await protectedRouteMiddleware(request);
      
      expect(response).toBe(NextResponse.next());
    });

    it('should redirect unauthenticated users from account pages to login', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const request = createMockRequest('/account/bookings');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/auth/login?callbackUrl=/account/bookings');
    });

    it('should allow admin users to access customer account pages', async () => {
      mockGetToken.mockResolvedValue({
        email: 'admin@example.com',
        role: 'ADMIN',
        sub: 'admin-id',
      });
      
      const request = createMockRequest('/account/settings');
      const response = await protectedRouteMiddleware(request);
      
      expect(response).toBe(NextResponse.next());
    });
  });

  describe('Admin Protected Routes', () => {
    it('should allow admin users to access admin pages', async () => {
      mockGetToken.mockResolvedValue({
        email: 'admin@example.com',
        role: 'ADMIN',
        sub: 'admin-id',
      });
      
      const request = createMockRequest('/admin/dashboard');
      const response = await protectedRouteMiddleware(request);
      
      expect(response).toBe(NextResponse.next());
    });

    it('should redirect customers from admin pages to home', async () => {
      mockGetToken.mockResolvedValue({
        email: 'customer@example.com',
        role: 'CUSTOMER',
        sub: 'user-id',
      });
      
      const request = createMockRequest('/admin/dashboard');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });

    it('should redirect unauthenticated users from admin pages to login', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const request = createMockRequest('/admin/bookings');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/auth/login?callbackUrl=/admin/bookings');
    });
  });

  describe('API Routes', () => {
    it('should protect admin API routes', async () => {
      mockGetToken.mockResolvedValue({
        email: 'customer@example.com',
        role: 'CUSTOMER',
        sub: 'user-id',
      });
      
      const request = createMockRequest('/api/admin/bookings');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });

    it('should allow admin access to admin API routes', async () => {
      mockGetToken.mockResolvedValue({
        email: 'admin@example.com',
        role: 'ADMIN',
        sub: 'admin-id',
      });
      
      const request = createMockRequest('/api/admin/bookings');
      const response = await protectedRouteMiddleware(request);
      
      expect(response).toBe(NextResponse.next());
    });

    it('should protect authenticated API routes', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const request = createMockRequest('/api/bookings/create');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Redirect Behavior', () => {
    it('should preserve query parameters in callback URL', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const request = createMockRequest('/account/bookings?filter=upcoming&sort=date');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe(
        '/auth/login?callbackUrl=/account/bookings?filter=upcoming&sort=date'
      );
    });

    it('should handle already authenticated users on auth pages', async () => {
      mockGetToken.mockResolvedValue({
        email: 'customer@example.com',
        role: 'CUSTOMER',
        sub: 'user-id',
      });
      
      const request = createMockRequest('/auth/login');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });

    it('should redirect admin users from login to admin dashboard', async () => {
      mockGetToken.mockResolvedValue({
        email: 'admin@example.com',
        role: 'ADMIN',
        sub: 'admin-id',
      });
      
      const request = createMockRequest('/auth/login');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/admin/dashboard');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing role in token', async () => {
      mockGetToken.mockResolvedValue({
        email: 'user@example.com',
        sub: 'user-id',
        // role is missing
      } as any);
      
      const request = createMockRequest('/admin/dashboard');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });

    it('should handle malformed tokens gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('Invalid token'));
      
      const request = createMockRequest('/account/bookings');
      const response = await protectedRouteMiddleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/auth/login?callbackUrl=/account/bookings');
    });

    it('should allow OPTIONS requests without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const request = createMockRequest('/api/bookings', {
        'method': 'OPTIONS',
      });
      const response = await protectedRouteMiddleware(request);
      
      expect(response).toBe(NextResponse.next());
    });
  });
});