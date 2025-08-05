import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserMenu from '@/app/components/navigation/UserMenu';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('UserMenu', () => {
  const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockPush = jest.fn();

  const defaultUser = {
    email: 'user@example.com',
    name: 'John Doe',
    role: 'CUSTOMER',
    image: null,
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      refresh: jest.fn(),
      prefetch: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render user avatar and name', () => {
      render(<UserMenu user={defaultUser} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    });

    it('should show initials when no image is provided', () => {
      render(<UserMenu user={defaultUser} />);
      
      const avatar = screen.getByTestId('user-avatar');
      expect(avatar).toHaveTextContent('JD'); // John Doe initials
    });

    it('should show user image when provided', () => {
      const userWithImage = {
        ...defaultUser,
        image: 'https://example.com/avatar.jpg',
      };
      
      render(<UserMenu user={userWithImage} />);
      
      const avatarImage = screen.getByAltText('John Doe');
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should show fallback for users without name', () => {
      const userWithoutName = {
        ...defaultUser,
        name: null,
      };
      
      render(<UserMenu user={userWithoutName} />);
      
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByTestId('user-avatar')).toHaveTextContent('U'); // First letter of email
    });
  });

  describe('Dropdown Menu', () => {
    it('should toggle dropdown on click', async () => {
      render(<UserMenu user={defaultUser} />);
      
      const trigger = screen.getByRole('button', { name: /user menu/i });
      
      // Initially closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      
      // Click to open
      fireEvent.click(trigger);
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
      
      // Click to close
      fireEvent.click(trigger);
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <UserMenu user={defaultUser} />
          <button data-testid="outside">Outside</button>
        </div>
      );
      
      const trigger = screen.getByRole('button', { name: /user menu/i });
      fireEvent.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
      
      // Click outside
      fireEvent.click(screen.getByTestId('outside'));
      
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown on Escape key', async () => {
      render(<UserMenu user={defaultUser} />);
      
      const trigger = screen.getByRole('button', { name: /user menu/i });
      fireEvent.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
      
      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Menu Items', () => {
    it('should show customer menu items for customer users', async () => {
      render(<UserMenu user={defaultUser} />);
      
      fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /my bookings/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /account settings/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
      });
      
      // Should not show admin items
      expect(screen.queryByRole('menuitem', { name: /admin dashboard/i })).not.toBeInTheDocument();
    });

    it('should show admin menu items for admin users', async () => {
      const adminUser = {
        ...defaultUser,
        role: 'ADMIN',
      };
      
      render(<UserMenu user={adminUser} />);
      
      fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /admin dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /my bookings/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /account settings/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
      });
    });

    it('should have correct href attributes', async () => {
      render(<UserMenu user={defaultUser} />);
      
      fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /my bookings/i }))
          .toHaveAttribute('href', '/account/bookings');
        expect(screen.getByRole('menuitem', { name: /account settings/i }))
          .toHaveAttribute('href', '/account/settings');
      });
    });
  });

  describe('Sign Out', () => {
    it('should call signOut when clicking log out', async () => {
      render(<UserMenu user={defaultUser} />);
      
      fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      await waitFor(() => {
        const logoutButton = screen.getByRole('menuitem', { name: /log out/i });
        fireEvent.click(logoutButton);
      });
      
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    });

    it('should show loading state during sign out', async () => {
      mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<UserMenu user={defaultUser} />);
      
      fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      await waitFor(() => {
        const logoutButton = screen.getByRole('menuitem', { name: /log out/i });
        fireEvent.click(logoutButton);
      });
      
      expect(screen.getByText(/signing out/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(<UserMenu user={defaultUser} />);
      
      const trigger = screen.getByRole('button', { name: /user menu/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
      
      fireEvent.click(trigger);
      
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const menu = screen.getByRole('menu');
        expect(menu).toHaveAttribute('aria-labelledby', trigger.id);
      });
    });

    it('should support keyboard navigation', async () => {
      render(<UserMenu user={defaultUser} />);
      
      const trigger = screen.getByRole('button', { name: /user menu/i });
      trigger.focus();
      
      // Open with Enter key
      fireEvent.keyDown(trigger, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
      
      // First menu item should be focused
      const firstMenuItem = screen.getByRole('menuitem', { name: /my bookings/i });
      expect(document.activeElement).toBe(firstMenuItem);
      
      // Navigate with arrow keys
      fireEvent.keyDown(firstMenuItem, { key: 'ArrowDown' });
      const secondMenuItem = screen.getByRole('menuitem', { name: /account settings/i });
      expect(document.activeElement).toBe(secondMenuItem);
    });

    it('should trap focus within menu', async () => {
      render(<UserMenu user={defaultUser} />);
      
      fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        const lastMenuItem = menuItems[menuItems.length - 1];
        
        lastMenuItem.focus();
        fireEvent.keyDown(lastMenuItem, { key: 'Tab' });
        
        // Focus should wrap to first item
        expect(document.activeElement).toBe(menuItems[0]);
      });
    });
  });

  describe('Styling', () => {
    it('should apply hover styles to menu items', async () => {
      render(<UserMenu user={defaultUser} />);
      
      fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      await waitFor(() => {
        const menuItem = screen.getByRole('menuitem', { name: /my bookings/i });
        expect(menuItem).toHaveClass('hover:bg-gray-100');
      });
    });

    it('should have proper dropdown positioning', async () => {
      render(<UserMenu user={defaultUser} />);
      
      fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      await waitFor(() => {
        const menu = screen.getByRole('menu');
        expect(menu).toHaveClass('absolute');
        expect(menu).toHaveClass('right-0');
        expect(menu).toHaveClass('mt-2');
      });
    });
  });
});