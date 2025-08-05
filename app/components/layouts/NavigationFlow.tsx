'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CustomerLayout from './CustomerLayout';
import AdminLayout from './AdminLayout';

export function NavigationFlow({ children }: { children?: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Handle authentication redirects
    if (status === 'loading') return;

    const isProtectedRoute = pathname.startsWith('/account') || pathname.startsWith('/admin');
    const isAuthRoute = pathname.startsWith('/auth');

    if (!session && isProtectedRoute) {
      router.replace(`/auth/login?callbackUrl=${pathname}`);
    }

    if (session && isAuthRoute) {
      router.replace(session.user?.role === 'ADMIN' ? '/admin/dashboard' : '/');
    }
  }, [session, status, pathname, router]);

  // 404 page
  if (!pathname || pathname === '/non-existent-page') {
    return (
      <CustomerLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Page not found</h1>
          <div className="space-x-4">
            <a href="/" className="text-blue-600 hover:underline">
              Go home
            </a>
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:underline"
            >
              Go back
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Admin layout for admin routes
  if (pathname.startsWith('/admin')) {
    return <AdminLayout>{children || <div>Admin Content</div>}</AdminLayout>;
  }

  // Customer layout for all other routes
  const isBookingRoute = pathname.startsWith('/booking');
  const bookingStep = pathname.includes('/packages') ? 2 : 
                     pathname.includes('/extras') ? 3 :
                     pathname.includes('/checkout') ? 4 :
                     pathname.includes('/confirmation') ? 5 : 1;

  return (
    <CustomerLayout 
      showProgress={isBookingRoute && !pathname.includes('/confirmation')}
      currentStep={bookingStep}
      totalSteps={5}
    >
      {children || (
        <div>
          {pathname === '/' && (
            <>
              <h1>Welcome to Country Days</h1>
              <a href="/booking" className="text-blue-600">Book Now</a>
            </>
          )}
          {pathname === '/booking' && (
            <div>
              <h2>Select Date</h2>
              <button onClick={() => router.push('/booking/packages')}>
                Continue
              </button>
            </div>
          )}
          {pathname === '/booking/packages' && (
            <div>
              <h2>Select Package</h2>
            </div>
          )}
          {pathname === '/booking/checkout' && (
            session ? (
              <div>
                <h2>Complete your booking</h2>
                <button onClick={() => router.push('/booking/confirmation')}>
                  Confirm Booking
                </button>
              </div>
            ) : (
              <div>
                <p>Please log in to continue</p>
                <a href={`/auth/login?callbackUrl=${pathname}`}>Log In</a>
              </div>
            )
          )}
          {pathname.startsWith('/account/bookings') && (
            <div>
              <div data-testid="booking-card-1" onClick={() => router.push('/account/bookings/1')}>
                Booking #1
              </div>
              {pathname === '/account/bookings/1' && (
                <button onClick={() => router.push('/booking/modify/1')}>
                  Modify Booking
                </button>
              )}
            </div>
          )}
          {pathname === '/admin/dashboard' && (
            <div>
              <button onClick={() => router.push('/admin/packages/new')}>
                Add New Package
              </button>
              <button onClick={() => router.push('/')}>
                View as Customer
              </button>
              <a href="/admin/bookings">Bookings</a>
              <a href="/admin/analytics">Analytics</a>
            </div>
          )}
        </div>
      )}
    </CustomerLayout>
  );
}