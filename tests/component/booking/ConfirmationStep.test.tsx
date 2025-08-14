import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ConfirmationStep from '../../../app/components/booking/ConfirmationStep';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CustomerFormData } from '../../../app/types/booking';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' })
}));

// Mock window.print for print functionality
Object.defineProperty(window, 'print', {
  value: jest.fn(),
  writable: true
});

describe('ConfirmationStep Component', () => {
  const mockOnPrint = jest.fn();
  const mockOnDownload = jest.fn();
  const mockOnNewBooking = jest.fn();

  const mockCustomerDetails: CustomerFormData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+44 7123 456789',
    bookingNotes: 'Celebrating birthday - table near dance floor preferred',
    isGuest: false,
    promoCode: 'SUMMER10',
    discount: 25.00,
    finalAmount: 200.00
  };

  const mockBookingData = {
    bookingReference: 'BK2024-001234',
    bookingDate: '2024-06-15',
    totalAmount: 225.00,
    finalAmount: 200.00,
    discountAmount: 25.00,
    customerDetails: mockCustomerDetails,
    packages: [
      {
        id: '1',
        name: 'Boots & BBQ Package',
        quantity: 2,
        price: 85.00
      },
      {
        id: '2',
        name: 'Just Dancin Package',
        quantity: 1,
        price: 35.00
      }
    ],
    extras: [
      {
        id: '1',
        name: 'Photo Booth Access',
        quantity: 1,
        price: 20.00
      }
    ],
    paymentConfirmation: {
      paymentIntentId: 'pi_1234567890abcdef',
      status: 'succeeded',
      amount: 200.00
    }
  };

  const defaultProps = {
    bookingData: mockBookingData,
    onPrint: mockOnPrint,
    onDownload: mockOnDownload,
    onNewBooking: mockOnNewBooking,
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render confirmation heading', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: /booking confirmed/i })).toBeInTheDocument();
    });

    it('should display booking reference prominently', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const referenceElement = screen.getByText('BK2024-001234');
      expect(referenceElement).toBeInTheDocument();
      expect(referenceElement).toHaveClass('text-2xl', 'font-bold');
    });

    it('should display booking date formatted correctly', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/Saturday, June 15, 2024/i)).toBeInTheDocument();
    });

    it('should show customer details', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('+44 7123 456789')).toBeInTheDocument();
    });

    it('should list all selected packages with quantities and prices', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
      expect(screen.getByText('£85.00 per person')).toBeInTheDocument();
      
      expect(screen.getByText('Just Dancin Package')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 1')).toBeInTheDocument();
      expect(screen.getByText('£35.00 per person')).toBeInTheDocument();
    });

    it('should list all selected extras with quantities and prices', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('Photo Booth Access')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 1')).toBeInTheDocument();
      expect(screen.getByText('£20.00')).toBeInTheDocument();
    });

    it('should display total amounts correctly', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/subtotal.*£225\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/discount.*£25\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/total.*£200\.00/i)).toBeInTheDocument();
    });

    it('should show payment confirmation details', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/payment confirmed/i)).toBeInTheDocument();
      expect(screen.getByText('£200.00')).toBeInTheDocument();
      expect(screen.getByText(/payment status.*succeeded/i)).toBeInTheDocument();
    });

    it('should render success message and icon', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/your booking has been confirmed/i)).toBeInTheDocument();
      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
    });
  });

  describe('Booking Reference Display', () => {
    it('should display booking reference in large, prominent text', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const referenceElement = screen.getByText('BK2024-001234');
      expect(referenceElement).toHaveClass('text-2xl');
      expect(referenceElement.closest('[data-testid="booking-reference"]')).toBeInTheDocument();
    });

    it('should make reference easily copyable', async () => {
      const user = userEvent.setup();
      render(<ConfirmationStep {...defaultProps} />);
      
      const referenceElement = screen.getByText('BK2024-001234');
      await user.tripleClick(referenceElement);
      
      // Reference text should be selectable
      expect(referenceElement).toHaveStyle('user-select: text');
    });

    it('should handle long reference numbers correctly', () => {
      const longReferenceProps = {
        ...defaultProps,
        bookingData: {
          ...mockBookingData,
          bookingReference: 'BOOKING-2024-COUNTRY-DAYS-VERY-LONG-REFERENCE-12345678'
        }
      };
      
      render(<ConfirmationStep {...longReferenceProps} />);
      
      const referenceElement = screen.getByText(/BOOKING-2024-COUNTRY-DAYS/);
      expect(referenceElement).toBeInTheDocument();
      expect(referenceElement).toHaveClass('break-all');
    });

    it('should show reference in readable format', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const referenceContainer = screen.getByTestId('booking-reference');
      expect(referenceContainer).toHaveTextContent('Booking Reference:');
      expect(referenceContainer).toHaveTextContent('BK2024-001234');
    });
  });

  describe('Booking Details Display', () => {
    it('should format booking date in user-friendly format', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/Saturday, June 15, 2024/i)).toBeInTheDocument();
    });

    it('should display venue information', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/country days/i)).toBeInTheDocument();
      expect(screen.getByText(/nightclub/i)).toBeInTheDocument();
    });

    it('should show all package details with names and inclusions', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      expect(screen.getByText('Just Dancin Package')).toBeInTheDocument();
      
      // Check that package details section exists
      expect(screen.getByText(/selected packages/i)).toBeInTheDocument();
    });

    it('should show all extra items with descriptions', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('Photo Booth Access')).toBeInTheDocument();
      expect(screen.getByText(/selected extras/i)).toBeInTheDocument();
    });

    it('should calculate and display subtotals correctly', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      // Package subtotals: (2 × 85) + (1 × 35) = 205
      // Extra subtotals: (1 × 20) = 20
      // Total: 205 + 20 = 225
      expect(screen.getByText(/subtotal.*£225\.00/i)).toBeInTheDocument();
    });

    it('should show discount amount if applied', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/discount.*£25\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/promo code.*summer10/i)).toBeInTheDocument();
    });

    it('should highlight final total amount', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const totalElement = screen.getByText(/total.*£200\.00/i);
      expect(totalElement).toBeInTheDocument();
      expect(totalElement).toHaveClass('text-xl', 'font-bold');
    });
  });

  describe('Customer Information', () => {
    it('should display customer name', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display customer email', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('should display customer phone number', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('+44 7123 456789')).toBeInTheDocument();
    });

    it('should show special requests/notes if provided', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/celebrating birthday/i)).toBeInTheDocument();
      expect(screen.getByText(/table near dance floor/i)).toBeInTheDocument();
    });

    it('should handle missing optional fields gracefully', () => {
      const propsWithoutNotes = {
        ...defaultProps,
        bookingData: {
          ...mockBookingData,
          customerDetails: {
            ...mockCustomerDetails,
            bookingNotes: undefined
          }
        }
      };
      
      render(<ConfirmationStep {...propsWithoutNotes} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText(/special requests/i)).not.toBeInTheDocument();
    });
  });

  describe('Payment Confirmation', () => {
    it('should show payment status as confirmed', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/payment confirmed/i)).toBeInTheDocument();
      expect(screen.getByText(/succeeded/i)).toBeInTheDocument();
    });

    it('should display payment method information', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/payment method/i)).toBeInTheDocument();
      expect(screen.getByText(/card/i)).toBeInTheDocument();
    });

    it('should show payment amount matches booking total', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const paymentSection = screen.getByTestId('payment-confirmation');
      expect(within(paymentSection).getByText('£200.00')).toBeInTheDocument();
    });

    it('should display payment transaction ID', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/pi_1234567890abcdef/i)).toBeInTheDocument();
    });

    it('should show payment date/time', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const now = new Date().toLocaleDateString();
      expect(screen.getByText(new RegExp(now))).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render print button when onPrint provided', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /print confirmation/i })).toBeInTheDocument();
    });

    it('should render download button when onDownload provided', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });

    it('should render "Make Another Booking" button when onNewBooking provided', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /make another booking/i })).toBeInTheDocument();
    });

    it('should call correct handlers when buttons clicked', async () => {
      const user = userEvent.setup();
      render(<ConfirmationStep {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /print confirmation/i }));
      expect(mockOnPrint).toHaveBeenCalledTimes(1);
      
      await user.click(screen.getByRole('button', { name: /download pdf/i }));
      expect(mockOnDownload).toHaveBeenCalledTimes(1);
      
      await user.click(screen.getByRole('button', { name: /make another booking/i }));
      expect(mockOnNewBooking).toHaveBeenCalledTimes(1);
    });

    it('should disable buttons when loading', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<ConfirmationStep {...loadingProps} />);
      
      expect(screen.getByRole('button', { name: /print confirmation/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /make another booking/i })).toBeDisabled();
    });

    it('should handle missing handlers gracefully', () => {
      const propsWithoutHandlers = {
        bookingData: mockBookingData,
        isLoading: false,
        error: null
      };
      
      render(<ConfirmationStep {...propsWithoutHandlers} />);
      
      expect(screen.queryByRole('button', { name: /print confirmation/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /make another booking/i })).not.toBeInTheDocument();
    });
  });

  describe('Print Functionality', () => {
    it('should trigger print action when print button clicked', async () => {
      const user = userEvent.setup();
      render(<ConfirmationStep {...defaultProps} />);
      
      const printButton = screen.getByRole('button', { name: /print confirmation/i });
      await user.click(printButton);
      
      expect(mockOnPrint).toHaveBeenCalledTimes(1);
    });

    it('should call onPrint callback if provided', async () => {
      const user = userEvent.setup();
      render(<ConfirmationStep {...defaultProps} />);
      
      const printButton = screen.getByRole('button', { name: /print confirmation/i });
      await user.click(printButton);
      
      expect(mockOnPrint).toHaveBeenCalledWith();
    });

    it('should handle print errors gracefully', async () => {
      const user = userEvent.setup();
      const erroringOnPrint = jest.fn().mockImplementation(() => {
        throw new Error('Print failed');
      });
      
      const propsWithError = { ...defaultProps, onPrint: erroringOnPrint };
      render(<ConfirmationStep {...propsWithError} />);
      
      const printButton = screen.getByRole('button', { name: /print confirmation/i });
      
      // Should not throw error
      expect(async () => {
        await user.click(printButton);
      }).not.toThrow();
    });

    it('should format content appropriately for printing', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const printableContent = screen.getByTestId('confirmation-content');
      expect(printableContent).toHaveClass('print:text-black');
      expect(printableContent).toHaveClass('print:bg-white');
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when isLoading=true', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<ConfirmationStep {...loadingProps} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should disable all buttons when loading', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<ConfirmationStep {...loadingProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should show loading message', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<ConfirmationStep {...loadingProps} />);
      
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('should hide main content when loading', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<ConfirmationStep {...loadingProps} />);
      
      expect(screen.queryByText('BK2024-001234')).not.toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop provided', () => {
      const errorProps = {
        ...defaultProps,
        error: 'Failed to generate confirmation'
      };
      
      render(<ConfirmationStep {...errorProps} />);
      
      expect(screen.getByText(/failed to generate confirmation/i)).toBeInTheDocument();
    });

    it('should show error state UI', () => {
      const errorProps = {
        ...defaultProps,
        error: 'Something went wrong'
      };
      
      render(<ConfirmationStep {...errorProps} />);
      
      expect(screen.getByTestId('error-container')).toBeInTheDocument();
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should allow retry actions', async () => {
      const user = userEvent.setup();
      const mockOnRetry = jest.fn();
      const errorProps = {
        ...defaultProps,
        error: 'Network error',
        onRetry: mockOnRetry
      };
      
      render(<ConfirmationStep {...errorProps} />);
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);
      
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle missing booking data gracefully', () => {
      const propsWithMissingData = {
        ...defaultProps,
        // @ts-expect-error Testing missing data
        bookingData: null
      };
      
      render(<ConfirmationStep {...propsWithMissingData} />);
      
      expect(screen.getByText(/booking information unavailable/i)).toBeInTheDocument();
    });

    it('should show fallback content for missing information', () => {
      const incompleteBookingData = {
        ...mockBookingData,
        bookingReference: '',
        customerDetails: {
          ...mockCustomerDetails,
          name: '',
          email: ''
        }
      };
      
      const propsWithIncompleteData = {
        ...defaultProps,
        bookingData: incompleteBookingData
      };
      
      render(<ConfirmationStep {...propsWithIncompleteData} />);
      
      expect(screen.getByText(/reference not available/i)).toBeInTheDocument();
      expect(screen.getByText(/customer information incomplete/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4); // Customer, Payment, Packages, Extras
    });

    it('should include ARIA labels for important information', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByLabelText(/booking reference/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/customer information/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment confirmation/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ConfirmationStep {...defaultProps} />);
      
      const firstButton = screen.getByRole('button', { name: /print confirmation/i });
      firstButton.focus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /download pdf/i })).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /make another booking/i })).toHaveFocus();
    });

    it('should have proper focus management', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('tabindex', '-1');
    });

    it('should work with screen readers', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByRole('region', { name: /booking confirmation/i })).toBeInTheDocument();
      expect(screen.getByText(/booking confirmed successfully/i)).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<ConfirmationStep {...defaultProps} />);
      
      const container = screen.getByTestId('confirmation-container');
      expect(container).toHaveClass('px-4', 'sm:px-6');
    });

    it('should adapt layout for different screen sizes', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const actionButtons = screen.getByTestId('action-buttons');
      expect(actionButtons).toHaveClass('flex-col', 'sm:flex-row');
    });

    it('should maintain readability on small screens', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      const bookingReference = screen.getByTestId('booking-reference');
      expect(bookingReference).toHaveClass('text-lg', 'sm:text-2xl');
    });

    it('should handle long text content appropriately', () => {
      const longNotesData = {
        ...mockBookingData,
        customerDetails: {
          ...mockCustomerDetails,
          bookingNotes: 'This is a very long booking note that should wrap appropriately on small screens and maintain readability across all device sizes without breaking the layout or causing horizontal scrolling issues'
        }
      };
      
      const propsWithLongNotes = { ...defaultProps, bookingData: longNotesData };
      render(<ConfirmationStep {...propsWithLongNotes} />);
      
      const notesElement = screen.getByText(/this is a very long booking note/i);
      expect(notesElement).toHaveClass('break-words');
    });
  });

  describe('Data Formatting', () => {
    it('should format currency amounts correctly', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('£225.00')).toBeInTheDocument();
      expect(screen.getByText('£200.00')).toBeInTheDocument();
      expect(screen.getByText('£25.00')).toBeInTheDocument();
    });

    it('should format dates in user locale', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText(/Saturday, June 15, 2024/i)).toBeInTheDocument();
    });

    it('should handle different timezones appropriately', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      // Should show UK timezone for the venue
      expect(screen.getByText(/uk time/i)).toBeInTheDocument();
    });

    it('should format phone numbers correctly', () => {
      render(<ConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('+44 7123 456789')).toBeInTheDocument();
    });

    it('should truncate long text appropriately', () => {
      const longNameData = {
        ...mockBookingData,
        packages: [{
          id: '1',
          name: 'This is an extremely long package name that should be truncated appropriately',
          quantity: 1,
          price: 100.00
        }]
      };
      
      const propsWithLongName = { ...defaultProps, bookingData: longNameData };
      render(<ConfirmationStep {...propsWithLongName} />);
      
      const packageName = screen.getByText(/this is an extremely long package/i);
      expect(packageName).toHaveClass('truncate');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty packages array', () => {
      const emptyPackagesData = {
        ...mockBookingData,
        packages: []
      };
      
      const propsWithEmptyPackages = { ...defaultProps, bookingData: emptyPackagesData };
      render(<ConfirmationStep {...propsWithEmptyPackages} />);
      
      expect(screen.getByText(/no packages selected/i)).toBeInTheDocument();
    });

    it('should handle empty extras array', () => {
      const emptyExtrasData = {
        ...mockBookingData,
        extras: []
      };
      
      const propsWithEmptyExtras = { ...defaultProps, bookingData: emptyExtrasData };
      render(<ConfirmationStep {...propsWithEmptyExtras} />);
      
      expect(screen.getByText(/no extras selected/i)).toBeInTheDocument();
    });

    it('should handle zero discount amount', () => {
      const noDiscountData = {
        ...mockBookingData,
        discountAmount: 0,
        finalAmount: 225.00,
        customerDetails: {
          ...mockCustomerDetails,
          discount: 0,
          promoCode: null
        }
      };
      
      const propsWithNoDiscount = { ...defaultProps, bookingData: noDiscountData };
      render(<ConfirmationStep {...propsWithNoDiscount} />);
      
      expect(screen.queryByText(/discount/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/promo code/i)).not.toBeInTheDocument();
    });

    it('should handle missing customer details', () => {
      const missingCustomerData = {
        ...mockBookingData,
        // @ts-expect-error Testing missing data
        customerDetails: null
      };
      
      const propsWithMissingCustomer = { ...defaultProps, bookingData: missingCustomerData };
      render(<ConfirmationStep {...propsWithMissingCustomer} />);
      
      expect(screen.getByText(/customer information unavailable/i)).toBeInTheDocument();
    });

    it('should handle invalid payment data', () => {
      const invalidPaymentData = {
        ...mockBookingData,
        paymentConfirmation: {
          paymentIntentId: '',
          status: 'failed',
          amount: 0
        }
      };
      
      const propsWithInvalidPayment = { ...defaultProps, bookingData: invalidPaymentData };
      render(<ConfirmationStep {...propsWithInvalidPayment} />);
      
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
    });

    it('should handle very long booking references', () => {
      const veryLongReferenceData = {
        ...mockBookingData,
        bookingReference: 'BK-2024-COUNTRY-DAYS-NIGHTCLUB-BOOKING-CONFIRMATION-REFERENCE-NUMBER-123456789012345'
      };
      
      const propsWithLongReference = { ...defaultProps, bookingData: veryLongReferenceData };
      render(<ConfirmationStep {...propsWithLongReference} />);
      
      const referenceElement = screen.getByText(/BK-2024-COUNTRY-DAYS/);
      expect(referenceElement).toHaveClass('break-all');
    });
  });
});