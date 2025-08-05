import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerDetails } from '@/app/components/booking/CustomerDetails';
import { useSession } from 'next-auth/react';
import '@testing-library/jest-dom';

// Mock next-auth
jest.mock('next-auth/react');

// Mock fetch
global.fetch = jest.fn();

describe('CustomerDetails Component', () => {
  const mockOnDetailsSubmit = jest.fn();
  const mockSession = {
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'CUSTOMER'
    }
  };

  const defaultProps = {
    onDetailsSubmit: mockOnDetailsSubmit,
    selectedDate: '2024-02-14',
    subtotal: 250.00
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ data: null });
  });

  describe('Form Rendering', () => {
    it('should render all required form fields', () => {
      render(<CustomerDetails {...defaultProps} />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/booking notes/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter promo code/i)).toBeInTheDocument();
    });

    it('should show guest checkout option when user is not authenticated', () => {
      render(<CustomerDetails {...defaultProps} />);

      expect(screen.getByLabelText(/continue as guest/i)).toBeInTheDocument();
    });

    it('should not show guest checkout option when user is authenticated', () => {
      (useSession as jest.Mock).mockReturnValue({ data: mockSession });
      render(<CustomerDetails {...defaultProps} />);

      expect(screen.queryByLabelText(/continue as guest/i)).not.toBeInTheDocument();
    });

    it('should pre-fill form fields for authenticated users', () => {
      (useSession as jest.Mock).mockReturnValue({ data: mockSession });
      render(<CustomerDetails {...defaultProps} />);

      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    it('should display subtotal correctly', () => {
      render(<CustomerDetails {...defaultProps} />);

      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
      expect(screen.getByText('£250.00')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      render(<CustomerDetails {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /continue to payment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<CustomerDetails {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, 'invalid-email');
      
      const submitButton = screen.getByRole('button', { name: /continue to payment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      render(<CustomerDetails {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/phone number/i);
      await userEvent.type(phoneInput, '123');
      
      const submitButton = screen.getByRole('button', { name: /continue to payment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument();
      });
    });

    it('should allow submission with valid data', async () => {
      render(<CustomerDetails {...defaultProps} />);
      
      await userEvent.type(screen.getByLabelText(/full name/i), 'John Doe');
      await userEvent.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await userEvent.type(screen.getByLabelText(/phone number/i), '07123456789');
      await userEvent.type(screen.getByLabelText(/booking notes/i), 'Birthday celebration');
      
      const submitButton = screen.getByRole('button', { name: /continue to payment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnDetailsSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '07123456789',
          bookingNotes: 'Birthday celebration',
          isGuest: true,
          promoCode: null,
          discount: 0,
          finalAmount: 250.00
        });
      });
    });
  });

  describe('Promo Code Functionality', () => {
    it('should validate promo code when apply button is clicked', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          code: 'SAVE10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          discountAmount: 25.00
        })
      });

      render(<CustomerDetails {...defaultProps} />);
      
      const promoInput = screen.getByPlaceholderText(/enter promo code/i);
      await userEvent.type(promoInput, 'SAVE10');
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/promo code applied/i)).toBeInTheDocument();
        expect(screen.getByText('Discount:')).toBeInTheDocument();
        expect(screen.getByText('-£25.00')).toBeInTheDocument();
        expect(screen.getByText('Total:')).toBeInTheDocument();
        expect(screen.getByText('£225.00')).toBeInTheDocument();
      });
    });

    it('should show error for invalid promo code', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid or expired promo code'
        })
      });

      render(<CustomerDetails {...defaultProps} />);
      
      const promoInput = screen.getByPlaceholderText(/enter promo code/i);
      await userEvent.type(promoInput, 'INVALID');
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired promo code/i)).toBeInTheDocument();
      });
    });

    it('should show loading state while validating promo code', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<CustomerDetails {...defaultProps} />);
      
      const promoInput = screen.getByPlaceholderText(/enter promo code/i);
      await userEvent.type(promoInput, 'SAVE10');
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      expect(screen.getByText(/validating/i)).toBeInTheDocument();
    });

    it('should allow removing applied promo code', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          code: 'SAVE10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          discountAmount: 25.00
        })
      });

      render(<CustomerDetails {...defaultProps} />);
      
      const promoInput = screen.getByPlaceholderText(/enter promo code/i);
      await userEvent.type(promoInput, 'SAVE10');
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/promo code applied/i)).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText(/promo code applied/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Discount:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Guest Checkout', () => {
    it('should toggle between guest and sign-in prompts', () => {
      render(<CustomerDetails {...defaultProps} />);
      
      const guestCheckbox = screen.getByLabelText(/continue as guest/i);
      
      // Initially should show sign-in prompt
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      
      // Check guest checkbox
      fireEvent.click(guestCheckbox);
      
      // Should now show create account prompt
      expect(screen.getByText(/create an account after booking/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should include all form data and promo code in submission', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          code: 'FIXED20',
          discountType: 'FIXED_AMOUNT',
          discountValue: 20,
          discountAmount: 20.00
        })
      });

      render(<CustomerDetails {...defaultProps} />);
      
      // Fill form
      await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Smith');
      await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
      await userEvent.type(screen.getByLabelText(/phone number/i), '07987654321');
      await userEvent.type(screen.getByLabelText(/booking notes/i), 'VIP booth please');
      
      // Apply promo code
      await userEvent.type(screen.getByPlaceholderText(/enter promo code/i), 'FIXED20');
      fireEvent.click(screen.getByRole('button', { name: /apply/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/promo code applied/i)).toBeInTheDocument();
      });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /continue to payment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnDetailsSubmit).toHaveBeenCalledWith({
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '07987654321',
          bookingNotes: 'VIP booth please',
          isGuest: true,
          promoCode: 'FIXED20',
          discount: 20.00,
          finalAmount: 230.00
        });
      });
    });

    it('should disable submit button while processing', async () => {
      render(<CustomerDetails {...defaultProps} />);
      
      await userEvent.type(screen.getByLabelText(/full name/i), 'John Doe');
      await userEvent.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await userEvent.type(screen.getByLabelText(/phone number/i), '07123456789');
      
      const submitButton = screen.getByRole('button', { name: /continue to payment/i });
      
      // Mock onDetailsSubmit to be slow
      mockOnDetailsSubmit.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      fireEvent.click(submitButton);
      
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });
});