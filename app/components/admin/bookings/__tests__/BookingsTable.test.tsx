import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingsTable from '../BookingsTable';
import { BookingStatus } from '@prisma/client';

// Mock the fetch function
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const mockBookings = [
  {
    id: 'booking1',
    bookingReference: 'REF001',
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    bookingDate: new Date('2024-08-15'),
    status: 'CONFIRMED' as BookingStatus,
    finalAmount: 150.00,
    currency: 'gbp',
    createdAt: new Date('2024-08-10'),
    items: [{
      id: 'item1',
      quantity: 1,
      totalPrice: 150.00,
      package: { name: 'VIP Package' },
      extra: null,
    }],
    user: { name: 'John Doe', email: 'john@example.com' },
  },
  {
    id: 'booking2',
    bookingReference: 'REF002',
    guestName: 'Jane Smith',
    guestEmail: 'jane@example.com',
    bookingDate: new Date('2024-08-16'),
    status: 'PENDING' as BookingStatus,
    finalAmount: 200.00,
    currency: 'gbp',
    createdAt: new Date('2024-08-11'),
    items: [{
      id: 'item2',
      quantity: 1,
      totalPrice: 200.00,
      package: { name: 'Group Package' },
      extra: null,
    }],
    user: { name: 'Jane Smith', email: 'jane@example.com' },
  },
];

const mockPagination = {
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const defaultProps = {
  bookings: mockBookings,
  pagination: mockPagination,
  loading: false,
  onRefresh: jest.fn(),
  onEdit: jest.fn(),
  onCancel: jest.fn(),
  onRefund: jest.fn(),
};

describe('BookingsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render bookings table with correct headers', () => {
    render(<BookingsTable {...defaultProps} />);

    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Booking Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should display booking data correctly', () => {
    render(<BookingsTable {...defaultProps} />);

    expect(screen.getByText('REF001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('£150.00')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();

    expect(screen.getByText('REF002')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('£200.00')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('should format booking dates correctly', () => {
    render(<BookingsTable {...defaultProps} />);

    // Check for formatted dates (format: "15 Aug 2024")
    expect(screen.getByText('15 Aug 2024')).toBeInTheDocument();
    expect(screen.getByText('16 Aug 2024')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<BookingsTable {...defaultProps} loading={true} />);

    expect(screen.getByText('Loading bookings...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show empty state when no bookings', () => {
    render(
      <BookingsTable
        {...defaultProps}
        bookings={[]}
        pagination={{ ...mockPagination, total: 0 }}
      />
    );

    expect(screen.getByText('No bookings found')).toBeInTheDocument();
    expect(screen.getByText('There are currently no bookings to display.')).toBeInTheDocument();
  });

  it('should display pagination information', () => {
    render(<BookingsTable {...defaultProps} />);

    expect(screen.getByText('Showing 1-2 of 2 bookings')).toBeInTheDocument();
  });

  it('should handle pagination with multiple pages', () => {
    const paginationMultiplePages = {
      total: 50,
      page: 2,
      limit: 20,
      totalPages: 3,
    };

    render(
      <BookingsTable
        {...defaultProps}
        pagination={paginationMultiplePages}
      />
    );

    expect(screen.getByText('Showing 21-40 of 50 bookings')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingsTable {...defaultProps} />);

    const editButtons = screen.getAllByLabelText('Edit booking');
    await user.click(editButtons[0]);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockBookings[0]);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingsTable {...defaultProps} />);

    const cancelButtons = screen.getAllByLabelText('Cancel booking');
    await user.click(cancelButtons[0]);

    expect(defaultProps.onCancel).toHaveBeenCalledWith(mockBookings[0]);
  });

  it('should call onRefund when refund button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingsTable {...defaultProps} />);

    const refundButtons = screen.getAllByLabelText('Refund booking');
    await user.click(refundButtons[0]);

    expect(defaultProps.onRefund).toHaveBeenCalledWith(mockBookings[0]);
  });

  it('should disable action buttons for cancelled bookings', () => {
    const cancelledBookings = [{
      ...mockBookings[0],
      status: 'CANCELLED' as BookingStatus,
    }];

    render(
      <BookingsTable
        {...defaultProps}
        bookings={cancelledBookings}
      />
    );

    const editButton = screen.getByLabelText('Edit booking');
    const cancelButton = screen.getByLabelText('Cancel booking');
    
    expect(editButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should disable refund button for unpaid bookings', () => {
    const unpaidBookings = [{
      ...mockBookings[0],
      status: 'PENDING' as BookingStatus,
    }];

    render(
      <BookingsTable
        {...defaultProps}
        bookings={unpaidBookings}
      />
    );

    const refundButton = screen.getByLabelText('Refund booking');
    expect(refundButton).toBeDisabled();
  });

  it('should show correct status badges with appropriate colors', () => {
    render(<BookingsTable {...defaultProps} />);

    const confirmedBadge = screen.getByText('CONFIRMED');
    const pendingBadge = screen.getByText('PENDING');

    expect(confirmedBadge).toHaveClass('bg-green-100', 'text-green-800');
    expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('should handle row selection', async () => {
    const user = userEvent.setup();
    render(<BookingsTable {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First booking checkbox (index 0 is select all)

    expect(checkboxes[1]).toBeChecked();
  });

  it('should handle select all functionality', async () => {
    const user = userEvent.setup();
    render(<BookingsTable {...defaultProps} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(selectAllCheckbox);

    const bookingCheckboxes = screen.getAllByRole('checkbox').slice(1);
    bookingCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });

  it('should show bulk actions when bookings are selected', async () => {
    const user = userEvent.setup();
    render(<BookingsTable {...defaultProps} />);

    const firstBookingCheckbox = screen.getAllByRole('checkbox')[1];
    await user.click(firstBookingCheckbox);

    expect(screen.getByText('1 booking selected')).toBeInTheDocument();
    expect(screen.getByText('Cancel Selected')).toBeInTheDocument();
    expect(screen.getByText('Export Selected')).toBeInTheDocument();
  });

  it('should handle sorting by column headers', async () => {
    const user = userEvent.setup();
    const mockOnSort = jest.fn();
    
    render(
      <BookingsTable
        {...defaultProps}
        onSort={mockOnSort}
      />
    );

    const dateHeader = screen.getByText('Booking Date');
    await user.click(dateHeader);

    expect(mockOnSort).toHaveBeenCalledWith('bookingDate', 'asc');
  });

  it('should toggle sort direction on repeated clicks', async () => {
    const user = userEvent.setup();
    const mockOnSort = jest.fn();
    
    render(
      <BookingsTable
        {...defaultProps}
        onSort={mockOnSort}
        sortBy="bookingDate"
        sortOrder="asc"
      />
    );

    const dateHeader = screen.getByText('Booking Date');
    await user.click(dateHeader);

    expect(mockOnSort).toHaveBeenCalledWith('bookingDate', 'desc');
  });

  it('should display sort indicators', () => {
    render(
      <BookingsTable
        {...defaultProps}
        sortBy="bookingDate"
        sortOrder="asc"
      />
    );

    const dateHeader = screen.getByText('Booking Date');
    expect(dateHeader.parentElement).toContainHTML('↑');
  });

  it('should handle refresh action', async () => {
    const user = userEvent.setup();
    render(<BookingsTable {...defaultProps} />);

    const refreshButton = screen.getByLabelText('Refresh bookings');
    await user.click(refreshButton);

    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('should show booking details on row click', async () => {
    const user = userEvent.setup();
    const mockOnRowClick = jest.fn();
    
    render(
      <BookingsTable
        {...defaultProps}
        onRowClick={mockOnRowClick}
      />
    );

    const firstRow = screen.getByText('REF001').closest('tr');
    await user.click(firstRow!);

    expect(mockOnRowClick).toHaveBeenCalledWith(mockBookings[0]);
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    const mockOnRowClick = jest.fn();
    
    render(
      <BookingsTable
        {...defaultProps}
        onRowClick={mockOnRowClick}
      />
    );

    const firstRow = screen.getByText('REF001').closest('tr');
    firstRow!.focus();
    await user.keyboard('{Enter}');

    expect(mockOnRowClick).toHaveBeenCalledWith(mockBookings[0]);
  });
});