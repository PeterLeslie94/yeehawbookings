import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingSearchBar from '../BookingSearchBar';
import { BookingStatus } from '@prisma/client';

const defaultProps = {
  onSearch: jest.fn(),
  onFilterChange: jest.fn(),
  onSortChange: jest.fn(),
  onExport: jest.fn(),
  loading: false,
  totalCount: 0,
};

describe('BookingSearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search input and filters', () => {
    render(<BookingSearchBar {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search by reference, name, or email...')).toBeInTheDocument();
    expect(screen.getByLabelText('Status filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Date range start')).toBeInTheDocument();
    expect(screen.getByLabelText('Date range end')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });

  it('should call onSearch when search input changes', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search by reference, name, or email...');
    await user.type(searchInput, 'john');

    // Should debounce the search
    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalledWith('john');
    }, { timeout: 1000 });
  });

  it('should debounce search input', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search by reference, name, or email...');
    await user.type(searchInput, 'j');
    await user.type(searchInput, 'o');
    await user.type(searchInput, 'h');
    await user.type(searchInput, 'n');

    // Should only call once after debounce delay
    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSearch).toHaveBeenCalledWith('john');
    }, { timeout: 1000 });
  });

  it('should call onSearch immediately when search is cleared', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search by reference, name, or email...');
    await user.type(searchInput, 'john');
    
    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalledWith('john');
    });

    await user.clear(searchInput);
    
    expect(defaultProps.onSearch).toHaveBeenCalledWith('');
  });

  it('should display status filter options', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const statusFilter = screen.getByLabelText('Status filter');
    await user.click(statusFilter);

    expect(screen.getByText('All Statuses')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('Refunded')).toBeInTheDocument();
  });

  it('should call onFilterChange when status filter changes', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const statusFilter = screen.getByLabelText('Status filter');
    await user.selectOptions(statusFilter, 'CONFIRMED');

    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
      status: 'CONFIRMED',
    });
  });

  it('should handle date range filter changes', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const startDateInput = screen.getByLabelText('Date range start');
    const endDateInput = screen.getByLabelText('Date range end');

    await user.type(startDateInput, '2024-08-01');
    await user.type(endDateInput, '2024-08-31');

    await waitFor(() => {
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        startDate: '2024-08-01',
        endDate: '2024-08-31',
      });
    });
  });

  it('should validate date range', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const startDateInput = screen.getByLabelText('Date range start');
    const endDateInput = screen.getByLabelText('Date range end');

    await user.type(startDateInput, '2024-08-31');
    await user.type(endDateInput, '2024-08-01');

    expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
  });

  it('should display sort options', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const sortSelect = screen.getByLabelText('Sort by');
    await user.click(sortSelect);

    expect(screen.getByText('Newest First')).toBeInTheDocument();
    expect(screen.getByText('Oldest First')).toBeInTheDocument();
    expect(screen.getByText('Booking Date (Upcoming)')).toBeInTheDocument();
    expect(screen.getByText('Booking Date (Recent)')).toBeInTheDocument();
    expect(screen.getByText('Amount (High to Low)')).toBeInTheDocument();
    expect(screen.getByText('Amount (Low to High)')).toBeInTheDocument();
  });

  it('should call onSortChange when sort option changes', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'bookingDate-asc');

    expect(defaultProps.onSortChange).toHaveBeenCalledWith('bookingDate', 'asc');
  });

  it('should show export button and handle export', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeInTheDocument();

    await user.click(exportButton);
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it('should disable export button when no bookings', () => {
    render(<BookingSearchBar {...defaultProps} totalCount={0} />);

    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeDisabled();
  });

  it('should enable export button when bookings exist', () => {
    render(<BookingSearchBar {...defaultProps} totalCount={5} />);

    const exportButton = screen.getByText('Export');
    expect(exportButton).not.toBeDisabled();
  });

  it('should show clear filters button when filters are applied', () => {
    render(
      <BookingSearchBar
        {...defaultProps}
        initialFilters={{
          status: 'CONFIRMED',
          startDate: '2024-08-01',
        }}
      />
    );

    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('should clear all filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BookingSearchBar
        {...defaultProps}
        initialFilters={{
          status: 'CONFIRMED',
          startDate: '2024-08-01',
        }}
      />
    );

    const clearButton = screen.getByText('Clear Filters');
    await user.click(clearButton);

    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({});
    expect(defaultProps.onSearch).toHaveBeenCalledWith('');
  });

  it('should show loading state in search input', () => {
    render(<BookingSearchBar {...defaultProps} loading={true} />);

    const searchInput = screen.getByPlaceholderText('Search by reference, name, or email...');
    expect(searchInput).toHaveAttribute('aria-busy', 'true');
  });

  it('should show results count', () => {
    render(<BookingSearchBar {...defaultProps} totalCount={25} />);

    expect(screen.getByText('25 bookings found')).toBeInTheDocument();
  });

  it('should handle keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    // Focus search input with Ctrl+F
    await user.keyboard('{Control>}f{/Control}');
    
    const searchInput = screen.getByPlaceholderText('Search by reference, name, or email...');
    expect(searchInput).toHaveFocus();
  });

  it('should show filter badges for active filters', () => {
    render(
      <BookingSearchBar
        {...defaultProps}
        initialFilters={{
          status: 'CONFIRMED',
          startDate: '2024-08-01',
          endDate: '2024-08-31',
        }}
      />
    );

    expect(screen.getByText('Status: Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Aug 1 - Aug 31, 2024')).toBeInTheDocument();
  });

  it('should remove individual filter badges', async () => {
    const user = userEvent.setup();
    render(
      <BookingSearchBar
        {...defaultProps}
        initialFilters={{
          status: 'CONFIRMED',
        }}
      />
    );

    const statusBadge = screen.getByText('Status: Confirmed');
    const removeButton = statusBadge.querySelector('[data-testid="remove-filter"]');
    
    await user.click(removeButton!);
    
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
      status: undefined,
    });
  });

  it('should show quick filter buttons', () => {
    render(<BookingSearchBar {...defaultProps} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
  });

  it('should apply quick filters', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    const todayButton = screen.getByText('Today');
    await user.click(todayButton);

    const today = new Date().toISOString().split('T')[0];
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
      startDate: today,
      endDate: today,
    });
  });

  it('should save and load filter presets', async () => {
    const user = userEvent.setup();
    render(<BookingSearchBar {...defaultProps} />);

    // Apply some filters first
    const statusFilter = screen.getByLabelText('Status filter');
    await user.selectOptions(statusFilter, 'CONFIRMED');

    // Save as preset
    const savePresetButton = screen.getByText('Save Preset');
    await user.click(savePresetButton);

    const presetNameInput = screen.getByPlaceholderText('Enter preset name...');
    await user.type(presetNameInput, 'Confirmed Bookings');

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    // Preset should appear in dropdown
    expect(screen.getByText('Confirmed Bookings')).toBeInTheDocument();
  });
});