import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RefundDialog from '../RefundDialog';
import { BookingStatus } from '@prisma/client';

// Mock the fetch function
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const mockBooking = {
  id: 'booking1',
  bookingReference: 'REF001',
  guestName: 'John Doe',
  guestEmail: 'john@example.com',
  status: 'CONFIRMED' as BookingStatus,
  finalAmount: 150.00,
  currency: 'gbp',
  paidAt: new Date('2024-08-10'),
  refundAmount: null,
  items: [
    {
      id: 'item1',
      quantity: 1,
      totalPrice: 150.00,
      package: { name: 'VIP Package' },
    }
  ],
};

const defaultProps = {
  isOpen: true,
  booking: mockBooking,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

describe('RefundDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { ...mockBooking, status: 'REFUNDED' } }),
    } as Response);
  });

  it('should not render when isOpen is false', () => {
    render(<RefundDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Process Refund')).not.toBeInTheDocument();
  });

  it('should render refund dialog when open', () => {
    render(<RefundDialog {...defaultProps} />);

    expect(screen.getByText('Process Refund')).toBeInTheDocument();
    expect(screen.getByText('REF001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Total Amount: £150.00')).toBeInTheDocument();
  });

  it('should display refund type options', () => {
    render(<RefundDialog {...defaultProps} />);

    expect(screen.getByLabelText('Full Refund')).toBeInTheDocument();
    expect(screen.getByLabelText('Partial Refund')).toBeInTheDocument();
  });

  it('should default to full refund', () => {
    render(<RefundDialog {...defaultProps} />);

    const fullRefundRadio = screen.getByLabelText('Full Refund');
    expect(fullRefundRadio).toBeChecked();

    const amountInput = screen.getByLabelText('Refund Amount');
    expect(amountInput).toHaveValue(150.00);
    expect(amountInput).toBeDisabled();
  });

  it('should enable amount input for partial refund', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const partialRefundRadio = screen.getByLabelText('Partial Refund');
    await user.click(partialRefundRadio);

    const amountInput = screen.getByLabelText('Refund Amount');
    expect(amountInput).not.toBeDisabled();
    expect(amountInput).toHaveValue(0);
  });

  it('should require refund reason', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    expect(screen.getByText('Refund reason is required')).toBeInTheDocument();
  });

  it('should validate partial refund amount', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const partialRefundRadio = screen.getByLabelText('Partial Refund');
    await user.click(partialRefundRadio);

    const amountInput = screen.getByLabelText('Refund Amount');
    await user.type(amountInput, '200'); // More than booking amount

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    expect(screen.getByText('Amount cannot exceed £150.00')).toBeInTheDocument();
  });

  it('should validate positive refund amount', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const partialRefundRadio = screen.getByLabelText('Partial Refund');
    await user.click(partialRefundRadio);

    const amountInput = screen.getByLabelText('Refund Amount');
    await user.type(amountInput, '-50');

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    expect(screen.getByText('Amount must be positive')).toBeInTheDocument();
  });

  it('should process full refund successfully', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/bookings/booking1/refund',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 150.00,
            reason: 'Customer request',
            type: 'full',
          }),
        })
      );
    });

    expect(defaultProps.onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REFUNDED' })
    );
  });

  it('should process partial refund successfully', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const partialRefundRadio = screen.getByLabelText('Partial Refund');
    await user.click(partialRefundRadio);

    const amountInput = screen.getByLabelText('Refund Amount');
    await user.type(amountInput, '75');

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Partial cancellation');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/bookings/booking1/refund',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            amount: 75.00,
            reason: 'Partial cancellation',
            type: 'partial',
          }),
        })
      );
    });
  });

  it('should show loading state during refund processing', async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(processButton).toBeDisabled();
  });

  it('should handle refund errors', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Insufficient funds' }),
    } as Response);

    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to process refund: Insufficient funds')).toBeInTheDocument();
    });
  });

  it('should handle network errors', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to process refund. Please try again.')).toBeInTheDocument();
    });
  });

  it('should display refund preview', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    expect(screen.getByText('Refund Preview')).toBeInTheDocument();
    expect(screen.getByText('Amount to refund: £150.00')).toBeInTheDocument();
    expect(screen.getByText('Refund method: Original payment method')).toBeInTheDocument();
    expect(screen.getByText('Processing time: 5-10 business days')).toBeInTheDocument();
  });

  it('should update refund preview for partial refund', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const partialRefundRadio = screen.getByLabelText('Partial Refund');
    await user.click(partialRefundRadio);

    const amountInput = screen.getByLabelText('Refund Amount');
    await user.type(amountInput, '75');

    expect(screen.getByText('Amount to refund: £75.00')).toBeInTheDocument();
    expect(screen.getByText('Remaining amount: £75.00')).toBeInTheDocument();
  });

  it('should close dialog when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should close dialog when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close dialog');
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should close dialog on escape key', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    await user.keyboard('{Escape}');

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should prevent closing during refund processing', async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    // Try to close during processing
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();

    await user.keyboard('{Escape}');
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should show confirmation step before processing', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    expect(screen.getByText('Confirm Refund')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to refund £150.00?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should require confirmation before processing', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    const confirmButton = screen.getByText('Confirm Refund');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should allow canceling confirmation', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    const cancelConfirmButton = screen.getByText('Cancel');
    await user.click(cancelConfirmButton);

    expect(screen.queryByText('Confirm Refund')).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should show success message after successful refund', async () => {
    const user = userEvent.setup();
    render(<RefundDialog {...defaultProps} />);

    const reasonInput = screen.getByLabelText('Refund Reason');
    await user.type(reasonInput, 'Customer request');

    const processButton = screen.getByText('Process Refund');
    await user.click(processButton);

    const confirmButton = screen.getByText('Confirm Refund');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Refund Processed Successfully')).toBeInTheDocument();
      expect(screen.getByText('The refund of £150.00 has been processed.')).toBeInTheDocument();
    });
  });
});