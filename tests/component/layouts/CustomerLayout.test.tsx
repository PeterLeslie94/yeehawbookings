import React from 'react';
import { render, screen } from '@testing-library/react';
import CustomerLayout from '@/app/components/layouts/CustomerLayout';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/booking',
}));

// Mock Header and Footer components
jest.mock('@/app/components/navigation/Header', () => {
  return function Header() {
    return <header data-testid="header">Header</header>;
  };
});

jest.mock('@/app/components/navigation/Footer', () => {
  return function Footer() {
    return <footer data-testid="footer">Footer</footer>;
  };
});

describe('CustomerLayout', () => {
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render header, main content, and footer', () => {
      render(
        <CustomerLayout>
          <div data-testid="content">Page Content</div>
        </CustomerLayout>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should wrap content in proper container', () => {
      const { container } = render(
        <CustomerLayout>
          <div>Content</div>
        </CustomerLayout>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toHaveClass('flex-grow');
      expect(mainElement).toHaveClass('container');
      expect(mainElement).toHaveClass('mx-auto');
    });

    it('should apply customer-specific styling', () => {
      const { container } = render(
        <CustomerLayout>
          <div>Content</div>
        </CustomerLayout>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('customer-layout');
    });
  });

  describe('Booking Progress Indicator', () => {
    it('should show progress indicator on booking pages', () => {
      // Mock pathname to be a booking page
      jest.mock('next/navigation', () => ({
        usePathname: () => '/booking/date',
      }));

      render(
        <CustomerLayout showProgress={true} currentStep={1} totalSteps={5}>
          <div>Booking Content</div>
        </CustomerLayout>
      );

      expect(screen.getByTestId('booking-progress')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    });

    it('should not show progress indicator on non-booking pages', () => {
      render(
        <CustomerLayout showProgress={false}>
          <div>Home Content</div>
        </CustomerLayout>
      );

      expect(screen.queryByTestId('booking-progress')).not.toBeInTheDocument();
    });

    it('should display correct progress percentage', () => {
      render(
        <CustomerLayout showProgress={true} currentStep={3} totalSteps={5}>
          <div>Content</div>
        </CustomerLayout>
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Authentication State', () => {
    it('should render correctly for authenticated users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'user@example.com', role: 'CUSTOMER' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(
        <CustomerLayout>
          <div>Authenticated Content</div>
        </CustomerLayout>
      );

      expect(screen.getByText('Authenticated Content')).toBeInTheDocument();
    });

    it('should render correctly for unauthenticated users', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      render(
        <CustomerLayout>
          <div>Public Content</div>
        </CustomerLayout>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-friendly container padding', () => {
      const { container } = render(
        <CustomerLayout>
          <div>Content</div>
        </CustomerLayout>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('px-4');
      expect(mainElement).toHaveClass('sm:px-6');
      expect(mainElement).toHaveClass('lg:px-8');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(
        <CustomerLayout>
          <div>Content</div>
        </CustomerLayout>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('SEO and Metadata', () => {
    it('should include proper page structure for SEO', () => {
      const { container } = render(
        <CustomerLayout>
          <h1>Page Title</h1>
          <div>Content</div>
        </CustomerLayout>
      );

      expect(container.querySelector('h1')).toBeInTheDocument();
    });
  });
});