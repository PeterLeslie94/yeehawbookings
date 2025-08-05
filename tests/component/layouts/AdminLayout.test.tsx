import React from 'react';
import { render, screen, within } from '@testing-library/react';
import AdminLayout from '@/app/components/layouts/AdminLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/admin/dashboard',
}));

// Mock AdminSidebar component
jest.mock('@/app/components/navigation/AdminSidebar', () => {
  return function AdminSidebar() {
    return <aside data-testid="admin-sidebar">Admin Sidebar</aside>;
  };
});

// Mock Header component
jest.mock('@/app/components/navigation/Header', () => {
  return function Header() {
    return <header data-testid="admin-header">Admin Header</header>;
  };
});

describe('AdminLayout', () => {
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockPush = jest.fn();

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      refresh: jest.fn(),
      prefetch: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    } as any);

    // Default to authenticated admin user
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'admin@example.com', role: 'ADMIN' },
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render sidebar and main content area', () => {
      render(
        <AdminLayout>
          <div data-testid="admin-content">Admin Content</div>
        </AdminLayout>
      );

      expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
      expect(screen.getByTestId('admin-header')).toBeInTheDocument();
    });

    it('should have proper admin layout structure', () => {
      const { container } = render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      const layoutContainer = container.querySelector('.admin-layout');
      expect(layoutContainer).toBeInTheDocument();
      
      const mainGrid = container.querySelector('.admin-grid');
      expect(mainGrid).toHaveClass('grid');
      expect(mainGrid).toHaveClass('grid-cols-[250px_1fr]');
    });

    it('should render breadcrumbs', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
      expect(breadcrumbNav).toBeInTheDocument();
      expect(within(breadcrumbNav).getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect to login if user is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      expect(mockPush).toHaveBeenCalledWith('/auth/login?callbackUrl=/admin/dashboard');
    });

    it('should redirect to home if user is not an admin', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'user@example.com', role: 'CUSTOMER' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      expect(mockPush).toHaveBeenCalledWith('/');
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    it('should show loading state while checking authentication', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  describe('Page Title and Metadata', () => {
    it('should display page title when provided', () => {
      render(
        <AdminLayout pageTitle="Booking Management">
          <div>Content</div>
        </AdminLayout>
      );

      expect(screen.getByRole('heading', { name: 'Booking Management' })).toBeInTheDocument();
    });

    it('should display action buttons when provided', () => {
      const actions = (
        <button data-testid="action-button">Add New</button>
      );

      render(
        <AdminLayout pageTitle="Bookings" actions={actions}>
          <div>Content</div>
        </AdminLayout>
      );

      expect(screen.getByTestId('action-button')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive sidebar toggle for mobile', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      const mobileMenuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(mobileMenuButton).toBeInTheDocument();
      expect(mobileMenuButton).toHaveClass('lg:hidden');
    });

    it('should apply responsive grid classes', () => {
      const { container } = render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      const mainGrid = container.querySelector('.admin-grid');
      expect(mainGrid).toHaveClass('lg:grid-cols-[250px_1fr]');
    });
  });

  describe('Quick Stats Section', () => {
    it('should render quick stats when provided', () => {
      const stats = [
        { label: 'Total Bookings', value: '156' },
        { label: 'Revenue', value: '£12,450' },
      ];

      render(
        <AdminLayout quickStats={stats}>
          <div>Content</div>
        </AdminLayout>
      );

      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
      expect(screen.getByText('156')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('£12,450')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display error message when there is an error', () => {
      render(
        <AdminLayout error="Failed to load data">
          <div>Content</div>
        </AdminLayout>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });

  describe('Content Area', () => {
    it('should apply proper styling to content area', () => {
      const { container } = render(
        <AdminLayout>
          <div data-testid="content">Content</div>
        </AdminLayout>
      );

      const contentArea = screen.getByTestId('content').parentElement;
      expect(contentArea).toHaveClass('flex-1');
      expect(contentArea).toHaveClass('overflow-y-auto');
      expect(contentArea).toHaveClass('bg-gray-50');
    });
  });
});