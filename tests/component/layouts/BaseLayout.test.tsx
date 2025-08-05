import React from 'react';
import { render, screen } from '@testing-library/react';
import BaseLayout from '@/app/components/layouts/BaseLayout';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
}));

describe('BaseLayout', () => {
  describe('Rendering', () => {
    it('should render children content', () => {
      render(
        <BaseLayout>
          <div data-testid="child-content">Test Content</div>
        </BaseLayout>
      );
      
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should have proper semantic HTML structure', () => {
      const { container } = render(
        <BaseLayout>
          <div>Content</div>
        </BaseLayout>
      );
      
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('should apply base layout classes', () => {
      const { container } = render(
        <BaseLayout>
          <div>Content</div>
        </BaseLayout>
      );
      
      const layoutDiv = container.firstChild;
      expect(layoutDiv).toHaveClass('min-h-screen');
      expect(layoutDiv).toHaveClass('flex');
      expect(layoutDiv).toHaveClass('flex-col');
    });
  });

  describe('Error Boundary', () => {
    // Mock console.error to prevent test output pollution
    const originalError = console.error;
    beforeAll(() => {
      console.error = jest.fn();
    });
    afterAll(() => {
      console.error = originalError;
    });

    it('should catch and display errors from children', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <BaseLayout>
          <ThrowError />
        </BaseLayout>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should allow resetting after error', () => {
      const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) throw new Error('Test error');
        return <div>No error</div>;
      };

      const { rerender } = render(
        <BaseLayout>
          <ThrowError shouldThrow={true} />
        </BaseLayout>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Simulate reset by re-rendering without error
      rerender(
        <BaseLayout>
          <ThrowError shouldThrow={false} />
        </BaseLayout>
      );

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when isLoading prop is true', () => {
      render(
        <BaseLayout isLoading={true}>
          <div>Content</div>
        </BaseLayout>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should show content when isLoading prop is false', () => {
      render(
        <BaseLayout isLoading={false}>
          <div>Content</div>
        </BaseLayout>
      );

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA landmarks', () => {
      const { container } = render(
        <BaseLayout>
          <div>Content</div>
        </BaseLayout>
      );

      expect(container.querySelector('main')).toHaveAttribute('role', 'main');
    });

    it('should maintain focus management', () => {
      render(
        <BaseLayout>
          <button>Focusable Button</button>
        </BaseLayout>
      );

      const button = screen.getByRole('button', { name: 'Focusable Button' });
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});