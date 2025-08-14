import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingDetailsModal from '../BookingDetailsModal';
import { BookingStatus } from '@prisma/client';

// Mock the fetch function
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const mockBooking = {
  id: 'booking1',
  bookingReference: 'REF001',
  userId: 'user1',
  guestName: 'John Doe',
  guestEmail: 'john@example.com',
  bookingDate: new Date('2024-08-15'),
  status: 'CONFIRMED' as BookingStatus,
  totalAmount: 150.00,
  discountAmount: 0,
  finalAmount: 150.00,
  currency: 'gbp',
  customerNotes: 'Birthday celebration',
  stripePaymentId: 'pi_test123',
  stripePaymentIntentId: 'pi_test123',
  paidAt: new Date('2024-08-10'),
  createdAt: new Date('2024-08-10'),
  updatedAt: new Date('2024-08-10'),
  items: [
    {
      id: 'item1',
      itemType: 'PACKAGE',
      quantity: 1,
      unitPrice: 150.00,
      totalPrice: 150.00,
      package: {
        id: 'pkg1',
        name: 'VIP Package',
        description: 'Premium experience with bottle service',
        inclusions: ['Premium booth', 'Bottle service', 'Dedicated host'],
      },
      extra: null,
    }
  ],
  user: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  promoCode: null,
};

const defaultProps = {
  isOpen: true,
  booking: mockBooking,
  onClose: jest.fn(),
  onUpdate: jest.fn(),
  onRefund: jest.fn(),
  onCancel: jest.fn(),
};

describe('BookingDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockBooking }),
    } as Response);
  });

  it('should not render when isOpen is false', () => {
    render(<BookingDetailsModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Booking Details')).not.toBeInTheDocument();
  });

  it('should render booking details when open', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Booking Details')).toBeInTheDocument();
    expect(screen.getByText('REF001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('£150.00')).toBeInTheDocument();
    expect(screen.getByText('Birthday celebration')).toBeInTheDocument();
  });

  it('should display booking status with correct styling', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    const statusBadge = screen.getByText('CONFIRMED');
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('should display booking items correctly', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('VIP Package')).toBeInTheDocument();
    expect(screen.getByText('Premium experience with bottle service')).toBeInTheDocument();
    expect(screen.getByText('Quantity: 1')).toBeInTheDocument();
    expect(screen.getByText('Unit Price: £150.00')).toBeInTheDocument();
    expect(screen.getByText('Total: £150.00')).toBeInTheDocument();
  });

  it('should display package inclusions', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Premium booth')).toBeInTheDocument();
    expect(screen.getByText('Bottle service')).toBeInTheDocument();
    expect(screen.getByText('Dedicated host')).toBeInTheDocument();
  });

  it('should display payment information when paid', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Payment Status: Paid')).toBeInTheDocument();
    expect(screen.getByText('Payment ID: pi_test123')).toBeInTheDocument();
    expect(screen.getByText('Paid on: 10 Aug 2024')).toBeInTheDocument();
  });

  it('should display unpaid status for pending bookings', () => {
    const unpaidBooking = {
      ...mockBooking,
      status: 'PENDING' as BookingStatus,
      paidAt: null,
      stripePaymentId: null,
    };

    render(
      <BookingDetailsModal
        {...defaultProps}
        booking={unpaidBooking}
      />
    );

    expect(screen.getByText('Payment Status: Pending')).toBeInTheDocument();
  });

  it('should show edit form when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const editButton = screen.getByText('Edit Booking');
    await user.click(editButton);

    expect(screen.getByLabelText('Customer Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('should pre-populate edit form with booking data', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const editButton = screen.getByText('Edit Booking');
    await user.click(editButton);

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Birthday celebration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CONFIRMED')).toBeInTheDocument();
  });

  it('should validate email format in edit form', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const editButton = screen.getByText('Edit Booking');
    await user.click(editButton);

    const emailInput = screen.getByLabelText('Customer Email');
    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('should save changes and call onUpdate', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const editButton = screen.getByText('Edit Booking');
    await user.click(editButton);

    const nameInput = screen.getByLabelText('Customer Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(defaultProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          guestName: 'Jane Doe',
        })
      );
    });
  });

  it('should handle save errors gracefully', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Validation failed' }),
    } as Response);

    render(<BookingDetailsModal {...defaultProps} />);

    const editButton = screen.getByText('Edit Booking');
    await user.click(editButton);

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update booking: Validation failed')).toBeInTheDocument();
    });
  });

  it('should cancel edit mode when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const editButton = screen.getByText('Edit Booking');
    await user.click(editButton);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(screen.queryByLabelText('Customer Name')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Booking')).toBeInTheDocument();
  });

  it('should call onRefund when refund button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const refundButton = screen.getByText('Process Refund');
    await user.click(refundButton);

    expect(defaultProps.onRefund).toHaveBeenCalledWith(mockBooking);
  });

  it('should call onCancel when cancel booking button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel Booking');
    await user.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalledWith(mockBooking);
  });

  it('should disable actions for cancelled bookings', () => {
    const cancelledBooking = {
      ...mockBooking,
      status: 'CANCELLED' as BookingStatus,
    };

    render(
      <BookingDetailsModal
        {...defaultProps}
        booking={cancelledBooking}
      />
    );

    expect(screen.getByText('Edit Booking')).toBeDisabled();
    expect(screen.getByText('Cancel Booking')).toBeDisabled();
  });

  it('should disable refund for unpaid bookings', () => {
    const unpaidBooking = {
      ...mockBooking,
      status: 'PENDING' as BookingStatus,
      paidAt: null,
      stripePaymentId: null,
    };

    render(
      <BookingDetailsModal
        {...defaultProps}
        booking={unpaidBooking}
      />
    );

    expect(screen.getByText('Process Refund')).toBeDisabled();
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should close modal when escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    await user.keyboard('{Escape}');

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should handle modal backdrop click', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show tabs for different sections', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('should switch tabs when clicked', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const paymentTab = screen.getByText('Payment');
    await user.click(paymentTab);

    expect(paymentTab).toHaveClass('active');
  });

  it('should display booking timeline in history tab', async () => {
    const user = userEvent.setup();
    render(<BookingDetailsModal {...defaultProps} />);

    const historyTab = screen.getByText('History');
    await user.click(historyTab);

    expect(screen.getByText('Booking created')).toBeInTheDocument();
    expect(screen.getByText('Payment confirmed')).toBeInTheDocument();
  });

  it('should display total amount calculation', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Subtotal: £150.00')).toBeInTheDocument();
    expect(screen.getByText('Discount: £0.00')).toBeInTheDocument();
    expect(screen.getByText('Total: £150.00')).toBeInTheDocument();
  });

  it('should display discount information when applicable', () => {
    const discountedBooking = {
      ...mockBooking,
      discountAmount: 30.00,
      finalAmount: 120.00,
      promoCode: {
        id: 'promo1',
        code: 'SAVE20',
        description: '20% off',
        discountType: 'PERCENTAGE',
        discountValue: 20,
      },
    };

    render(
      <BookingDetailsModal
        {...defaultProps}
        booking={discountedBooking}
      />
    );

    expect(screen.getByText('Promo Code: SAVE20')).toBeInTheDocument();
    expect(screen.getByText('Discount: £30.00')).toBeInTheDocument();
    expect(screen.getByText('Total: £120.00')).toBeInTheDocument();
  });
});