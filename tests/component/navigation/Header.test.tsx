import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from '@/app/components/navigation/Header';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock UserMenu component
jest.mock('@/app/components/navigation/UserMenu', () => {
  return function UserMenu({ user }: { user: any }) {
    return <div data-testid="user-menu">User: {user.email}</div>;
  };
});

describe('Header', () => {
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
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
    
    mockUsePathname.mockReturnValue('/');
    
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render logo and site name', () => {
      render(<Header />);
      
      expect(screen.getByAltText('Country Days Logo')).toBeInTheDocument();
      expect(screen.getByText('Country Days')).toBeInTheDocument();
    });

    it('should render navigation links', () => {
      render(<Header />);
      
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /book now/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
    });

    it('should highlight active navigation link', () => {
      mockUsePathname.mockReturnValue('/booking');
      
      render(<Header />);
      
      const bookingLink = screen.getByRole('link', { name: /book now/i });
      expect(bookingLink).toHaveClass('active');
    });
  });

  describe('Authentication State', () => {
    it('should show login/signup buttons when unauthenticated', () => {
      render(<Header />);
      
      expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });

    it('should show user menu when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'user@example.com', role: 'CUSTOMER' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(<Header />);
      
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
      expect(screen.getByText('User: user@example.com')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    });

    it('should show admin link for admin users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'admin@example.com', role: 'ADMIN' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(<Header />);
      
      expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    it('should render mobile menu button', () => {
      render(<Header />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeInTheDocument();
      expect(mobileMenuButton).toHaveClass('md:hidden');
    });

    it('should toggle mobile menu on button click', () => {
      render(<Header />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      
      // Initially closed
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      
      // Click to open
      fireEvent.click(mobileMenuButton);
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      
      // Click to close
      fireEvent.click(mobileMenuButton);
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
    });

    it('should show navigation links in mobile menu', () => {
      render(<Header />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(mobileMenuButton);
      
      const mobileMenu = screen.getByTestId('mobile-menu');
      expect(mobileMenu).toContainElement(screen.getByRole('link', { name: /home/i }));
      expect(mobileMenu).toContainElement(screen.getByRole('link', { name: /book now/i }));
    });

    it('should close mobile menu when clicking outside', () => {
      render(
        <div>
          <Header />
          <div data-testid="outside">Outside content</div>
        </div>
      );
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(mobileMenuButton);
      
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      
      // Click outside
      fireEvent.click(screen.getByTestId('outside'));
      
      waitFor(() => {
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sticky Behavior', () => {
    it('should have sticky positioning', () => {
      const { container } = render(<Header />);
      
      const header = container.querySelector('header');
      expect(header).toHaveClass('sticky');
      expect(header).toHaveClass('top-0');
      expect(header).toHaveClass('z-50');
    });

    it('should add shadow on scroll', () => {
      const { container } = render(<Header />);
      
      const header = container.querySelector('header');
      
      // Initially no shadow
      expect(header).not.toHaveClass('shadow-md');
      
      // Simulate scroll
      fireEvent.scroll(window, { target: { scrollY: 100 } });
      
      waitFor(() => {
        expect(header).toHaveClass('shadow-md');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation role', () => {
      render(<Header />);
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have accessible mobile menu button', () => {
      render(<Header />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(mobileMenuButton);
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should support keyboard navigation', () => {
      render(<Header />);
      
      const firstLink = screen.getByRole('link', { name: /home/i });
      firstLink.focus();
      
      expect(document.activeElement).toBe(firstLink);
      
      // Tab to next link
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton loader when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(<Header />);
      
      expect(screen.getByTestId('header-skeleton')).toBeInTheDocument();
    });
  });
});