import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NavigationFlow } from '@/app/components/layouts/NavigationFlow';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Helper to render navigation flow with providers
const renderNavigationFlow = (initialPath: string = '/') => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  
  (useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
    back: jest.fn(),
  });
  
  (usePathname as jest.Mock).mockReturnValue(initialPath);
  
  const result = render(<NavigationFlow />);
  
  return {
    ...result,
    mockPush,
    mockReplace,
  };
};

describe('Navigation Flow Integration', () => {
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

  beforeEach(() => {
    // Default to unauthenticated state
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Navigation Flow', () => {
    it('should navigate from home to booking flow', async () => {
      const { mockPush } = renderNavigationFlow('/');
      
      // Click "Book Now" button
      const bookNowButton = screen.getByRole('link', { name: /book now/i });
      fireEvent.click(bookNowButton);
      
      expect(mockPush).toHaveBeenCalledWith('/booking');
    });

    it('should navigate through booking steps without authentication', async () => {
      const { mockPush, rerender } = renderNavigationFlow('/booking');
      
      // Step 1: Date selection
      expect(screen.getByText(/select date/i)).toBeInTheDocument();
      
      // Select a date and continue
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);
      
      expect(mockPush).toHaveBeenCalledWith('/booking/packages');
      
      // Simulate navigation to packages
      (usePathname as jest.Mock).mockReturnValue('/booking/packages');
      rerender(<NavigationFlow />);
      
      // Step 2: Package selection
      expect(screen.getByText(/select package/i)).toBeInTheDocument();
    });

    it('should show login prompt at checkout step', async () => {
      const { mockPush } = renderNavigationFlow('/booking/checkout');
      
      // Should see login prompt
      expect(screen.getByText(/please log in to continue/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
      
      // Click login should preserve booking state
      const loginLink = screen.getByRole('link', { name: /log in/i });
      fireEvent.click(loginLink);
      
      expect(mockPush).toHaveBeenCalledWith('/auth/login?callbackUrl=/booking/checkout');
    });
  });

  describe('Authenticated Customer Flow', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'customer@example.com', role: 'CUSTOMER' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should allow complete booking flow for authenticated users', async () => {
      const { mockPush } = renderNavigationFlow('/booking/checkout');
      
      // Should not see login prompt
      expect(screen.queryByText(/please log in to continue/i)).not.toBeInTheDocument();
      
      // Should see checkout form
      expect(screen.getByText(/complete your booking/i)).toBeInTheDocument();
      
      // Submit booking
      const submitButton = screen.getByRole('button', { name: /confirm booking/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/booking/confirmation');
      });
    });

    it('should navigate to account pages from user menu', async () => {
      const { mockPush } = renderNavigationFlow('/');
      
      // Open user menu
      const userMenuButton = screen.getByRole('button', { name: /user menu/i });
      fireEvent.click(userMenuButton);
      
      // Click "My Bookings"
      const myBookingsLink = await screen.findByRole('menuitem', { name: /my bookings/i });
      fireEvent.click(myBookingsLink);
      
      expect(mockPush).toHaveBeenCalledWith('/account/bookings');
    });

    it('should handle booking modification flow', async () => {
      const { mockPush } = renderNavigationFlow('/account/bookings');
      
      // Click on a booking to view details
      const bookingCard = screen.getByTestId('booking-card-1');
      fireEvent.click(bookingCard);
      
      expect(mockPush).toHaveBeenCalledWith('/account/bookings/1');
      
      // Navigate to modification
      (usePathname as jest.Mock).mockReturnValue('/account/bookings/1');
      const { rerender } = renderNavigationFlow('/account/bookings/1');
      
      const modifyButton = screen.getByRole('button', { name: /modify booking/i });
      fireEvent.click(modifyButton);
      
      expect(mockPush).toHaveBeenCalledWith('/booking/modify/1');
    });
  });

  describe('Admin Navigation Flow', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'admin@example.com', role: 'ADMIN' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should show admin link in header for admin users', () => {
      renderNavigationFlow('/');
      
      expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
    });

    it('should navigate through admin sections via sidebar', async () => {
      const { mockPush } = renderNavigationFlow('/admin/dashboard');
      
      // Click bookings in sidebar
      const bookingsLink = screen.getByRole('link', { name: /bookings/i });
      fireEvent.click(bookingsLink);
      
      expect(mockPush).toHaveBeenCalledWith('/admin/bookings');
      
      // Click analytics
      const analyticsLink = screen.getByRole('link', { name: /analytics/i });
      fireEvent.click(analyticsLink);
      
      expect(mockPush).toHaveBeenCalledWith('/admin/analytics');
    });

    it('should handle admin quick actions', async () => {
      const { mockPush } = renderNavigationFlow('/admin/dashboard');
      
      // Click "Add New Package" quick action
      const addPackageButton = screen.getByRole('button', { name: /add new package/i });
      fireEvent.click(addPackageButton);
      
      expect(mockPush).toHaveBeenCalledWith('/admin/packages/new');
    });

    it('should navigate from admin to customer view', async () => {
      const { mockPush } = renderNavigationFlow('/admin/dashboard');
      
      // Click "View as Customer" button
      const viewAsCustomerButton = screen.getByRole('button', { name: /view as customer/i });
      fireEvent.click(viewAsCustomerButton);
      
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should show correct breadcrumbs in admin pages', () => {
      renderNavigationFlow('/admin/bookings/123');
      
      const breadcrumbs = screen.getByRole('navigation', { name: /breadcrumb/i });
      expect(breadcrumbs).toContainElement(screen.getByText('Dashboard'));
      expect(breadcrumbs).toContainElement(screen.getByText('Bookings'));
      expect(breadcrumbs).toContainElement(screen.getByText('Booking #123'));
    });

    it('should navigate using breadcrumbs', async () => {
      const { mockPush } = renderNavigationFlow('/admin/bookings/123');
      
      // Click "Bookings" breadcrumb
      const bookingsBreadcrumb = screen.getByRole('link', { name: 'Bookings' });
      fireEvent.click(bookingsBreadcrumb);
      
      expect(mockPush).toHaveBeenCalledWith('/admin/bookings');
    });
  });

  describe('Mobile Navigation', () => {
    it('should handle mobile menu navigation', async () => {
      const { mockPush } = renderNavigationFlow('/');
      
      // Open mobile menu
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(mobileMenuButton);
      
      // Navigate to booking
      const bookingLink = await screen.findByRole('link', { name: /book now/i });
      fireEvent.click(bookingLink);
      
      expect(mockPush).toHaveBeenCalledWith('/booking');
      
      // Menu should close after navigation
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      });
    });

    it('should handle admin sidebar toggle on mobile', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'admin@example.com', role: 'ADMIN' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
      
      renderNavigationFlow('/admin/dashboard');
      
      // Toggle sidebar on mobile
      const sidebarToggle = screen.getByRole('button', { name: /toggle menu/i });
      fireEvent.click(sidebarToggle);
      
      // Sidebar should be visible
      expect(screen.getByTestId('mobile-overlay')).toBeInTheDocument();
      
      // Click a link
      const packagesLink = screen.getByRole('link', { name: /packages/i });
      fireEvent.click(packagesLink);
      
      // Sidebar should close
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-overlay')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error States and Redirects', () => {
    it('should redirect to login when session expires', async () => {
      const { mockReplace, rerender } = renderNavigationFlow('/account/bookings');
      
      // Initially authenticated
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'customer@example.com', role: 'CUSTOMER' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
      
      rerender(<NavigationFlow />);
      
      // Simulate session expiry
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });
      
      rerender(<NavigationFlow />);
      
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/auth/login?callbackUrl=/account/bookings');
      });
    });

    it('should handle 404 pages with navigation options', () => {
      renderNavigationFlow('/non-existent-page');
      
      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });
  });
});