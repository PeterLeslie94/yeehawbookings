import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminSidebar from '@/app/components/navigation/AdminSidebar';
import { usePathname } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('AdminSidebar', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/admin/dashboard');
  });

  describe('Rendering', () => {
    it('should render all navigation items', () => {
      render(<AdminSidebar />);
      
      // Main navigation items
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /bookings/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /packages/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /extras/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /availability/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /promo codes/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });

    it('should render section headers', () => {
      render(<AdminSidebar />);
      
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Management')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('should render icons for each navigation item', () => {
      render(<AdminSidebar />);
      
      expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('icon-bookings')).toBeInTheDocument();
      expect(screen.getByTestId('icon-packages')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight active navigation item', () => {
      mockUsePathname.mockReturnValue('/admin/bookings');
      
      render(<AdminSidebar />);
      
      const bookingsLink = screen.getByRole('link', { name: /bookings/i });
      expect(bookingsLink).toHaveClass('active');
      expect(bookingsLink).toHaveClass('bg-blue-50');
      expect(bookingsLink).toHaveClass('text-blue-700');
    });

    it('should not highlight inactive items', () => {
      mockUsePathname.mockReturnValue('/admin/dashboard');
      
      render(<AdminSidebar />);
      
      const bookingsLink = screen.getByRole('link', { name: /bookings/i });
      expect(bookingsLink).not.toHaveClass('active');
      expect(bookingsLink).not.toHaveClass('bg-blue-50');
    });
  });

  describe('Collapsible Behavior', () => {
    it('should toggle collapsed state', () => {
      render(<AdminSidebar />);
      
      const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
      
      // Initially expanded
      expect(screen.getByTestId('sidebar-content')).toHaveClass('w-64');
      
      // Click to collapse
      fireEvent.click(collapseButton);
      expect(screen.getByTestId('sidebar-content')).toHaveClass('w-16');
      
      // Labels should be hidden when collapsed
      expect(screen.getByText('Dashboard')).toHaveClass('hidden');
    });

    it('should show tooltips when collapsed', () => {
      render(<AdminSidebar />);
      
      const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
      fireEvent.click(collapseButton);
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      fireEvent.mouseEnter(dashboardLink);
      
      expect(screen.getByRole('tooltip', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  describe('Navigation Structure', () => {
    it('should have correct href attributes', () => {
      render(<AdminSidebar />);
      
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/admin/dashboard');
      expect(screen.getByRole('link', { name: /bookings/i })).toHaveAttribute('href', '/admin/bookings');
      expect(screen.getByRole('link', { name: /packages/i })).toHaveAttribute('href', '/admin/packages');
      expect(screen.getByRole('link', { name: /availability/i })).toHaveAttribute('href', '/admin/availability');
      expect(screen.getByRole('link', { name: /analytics/i })).toHaveAttribute('href', '/admin/analytics');
    });

    it('should group items by sections', () => {
      const { container } = render(<AdminSidebar />);
      
      const sections = container.querySelectorAll('.sidebar-section');
      expect(sections).toHaveLength(4); // Main, Management, Configuration, Reports
    });
  });

  describe('Mobile Behavior', () => {
    it('should render mobile overlay when isOpen is true', () => {
      render(<AdminSidebar isOpen={true} onClose={jest.fn()} />);
      
      expect(screen.getByTestId('mobile-overlay')).toBeInTheDocument();
    });

    it('should not render mobile overlay when isOpen is false', () => {
      render(<AdminSidebar isOpen={false} onClose={jest.fn()} />);
      
      expect(screen.queryByTestId('mobile-overlay')).not.toBeInTheDocument();
    });

    it('should call onClose when clicking overlay', () => {
      const onClose = jest.fn();
      render(<AdminSidebar isOpen={true} onClose={onClose} />);
      
      fireEvent.click(screen.getByTestId('mobile-overlay'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking close button', () => {
      const onClose = jest.fn();
      render(<AdminSidebar isOpen={true} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole('button', { name: /close sidebar/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation role', () => {
      render(<AdminSidebar />);
      
      expect(screen.getByRole('navigation', { name: /admin navigation/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<AdminSidebar />);
      
      const firstLink = screen.getByRole('link', { name: /dashboard/i });
      firstLink.focus();
      
      expect(document.activeElement).toBe(firstLink);
      
      // Tab to next link
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    });

    it('should have proper ARIA labels', () => {
      render(<AdminSidebar />);
      
      const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
      
      fireEvent.click(collapseButton);
      expect(collapseButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('User Info Section', () => {
    it('should display user information when provided', () => {
      const user = {
        name: 'Admin User',
        email: 'admin@countrydays.com',
        role: 'ADMIN',
      };
      
      render(<AdminSidebar user={user} />);
      
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@countrydays.com')).toBeInTheDocument();
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });

    it('should show logout button', () => {
      render(<AdminSidebar />);
      
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
  });

  describe('Badge Notifications', () => {
    it('should show notification badges when counts are provided', () => {
      const notificationCounts = {
        bookings: 5,
        analytics: 2,
      };
      
      render(<AdminSidebar notificationCounts={notificationCounts} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not show badges when count is zero', () => {
      const notificationCounts = {
        bookings: 0,
        analytics: 0,
      };
      
      render(<AdminSidebar notificationCounts={notificationCounts} />);
      
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });
  });
});