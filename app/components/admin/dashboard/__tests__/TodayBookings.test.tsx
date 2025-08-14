import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TodayBookings from '../TodayBookings';
import { TodayBooking } from '@/app/types/admin';
import { BookingStatus } from '@prisma/client';
import '@testing-library/jest-dom';

const mockBookings: TodayBooking[] = [
  {
    id: 'booking1',
    bookingReference: 'REF001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    status: BookingStatus.CONFIRMED,
    finalAmount: 150.00,
    bookingTime: '14:30',
    packages: [
      { name: 'VIP Package', quantity: 2 },
    ],
  },
  {
    id: 'booking2',
    bookingReference: 'REF002',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    status: BookingStatus.PENDING,
    finalAmount: 75.50,
    bookingTime: '16:15',
    packages: [
      { name: 'Standard Package', quantity: 1 },
      { name: 'Bottle Service', quantity: 1 },
    ],
  },
  {
    id: 'booking3',
    bookingReference: 'REF003',
    customerName: 'Mike Johnson',
    customerEmail: 'mike@example.com',
    status: BookingStatus.CANCELLED,
    finalAmount: 200.00,
    bookingTime: '10:45',
    packages: [
      { name: 'Group Package', quantity: 1 },
    ],
  },
];

describe('TodayBookings', () => {
  it('should render list of today\'s bookings', () => {
    render(<TodayBookings bookings={mockBookings} />);

    // Check if all bookings are rendered
    expect(screen.getByText('REF001')).toBeInTheDocument();
    expect(screen.getByText('REF002')).toBeInTheDocument();
    expect(screen.getByText('REF003')).toBeInTheDocument();
    
    // Check customer names
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
  });

  it('should display booking details correctly', () => {
    render(<TodayBookings bookings={[mockBookings[0]]} />);

    expect(screen.getByText('REF001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('£150.00')).toBeInTheDocument();
    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('VIP Package (2)')).toBeInTheDocument();
  });

  it('should display multiple packages correctly', () => {
    render(<TodayBookings bookings={[mockBookings[1]]} />);

    expect(screen.getByText('Standard Package (1)')).toBeInTheDocument();
    expect(screen.getByText('Bottle Service (1)')).toBeInTheDocument();
  });

  it('should display correct status badges', () => {
    render(<TodayBookings bookings={mockBookings} />);

    // Check for status badges
    const confirmedBadge = screen.getByText('CONFIRMED');
    const pendingBadge = screen.getByText('PENDING');
    const cancelledBadge = screen.getByText('CANCELLED');

    expect(confirmedBadge).toBeInTheDocument();
    expect(pendingBadge).toBeInTheDocument();
    expect(cancelledBadge).toBeInTheDocument();

    // Check status badge styling
    expect(confirmedBadge).toHaveClass('bg-green-100', 'text-green-800');
    expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    expect(cancelledBadge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('should show empty state when no bookings', () => {
    render(<TodayBookings bookings={[]} />);

    expect(screen.getByText('No bookings today')).toBeInTheDocument();
    expect(screen.getByText('There are no bookings scheduled for today.')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<TodayBookings bookings={[]} loading={true} />);

    // Should show skeleton loading states
    expect(screen.getAllByTestId('booking-skeleton')).toHaveLength(3); // Default skeleton count
  });

  it('should show error state', () => {
    render(
      <TodayBookings 
        bookings={[]} 
        error="Failed to load bookings" 
      />
    );

    expect(screen.getByText('Error loading bookings')).toBeInTheDocument();
    expect(screen.getByText('Failed to load bookings')).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button is clicked', () => {
    const mockRefresh = jest.fn();
    render(
      <TodayBookings 
        bookings={mockBookings} 
        onRefresh={mockRefresh} 
      />
    );

    const refreshButton = screen.getByLabelText('Refresh bookings');
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should format currency correctly for different amounts', () => {
    const bookingsWithDifferentAmounts: TodayBooking[] = [
      {
        ...mockBookings[0],
        finalAmount: 0,
      },
      {
        ...mockBookings[1],
        finalAmount: 1234.56,
      },
      {
        ...mockBookings[2],
        finalAmount: 99.99,
      },
    ];

    render(<TodayBookings bookings={bookingsWithDifferentAmounts} />);

    expect(screen.getByText('£0.00')).toBeInTheDocument();
    expect(screen.getByText('£1234.56')).toBeInTheDocument();
    expect(screen.getByText('£99.99')).toBeInTheDocument();
  });

  it('should handle refunded status correctly', () => {
    const refundedBooking: TodayBooking = {
      ...mockBookings[0],
      status: BookingStatus.REFUNDED,
    };

    render(<TodayBookings bookings={[refundedBooking]} />);

    const refundedBadge = screen.getByText('REFUNDED');
    expect(refundedBadge).toBeInTheDocument();
    expect(refundedBadge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('should limit displayed bookings when many are provided', () => {
    const manyBookings = Array.from({ length: 20 }, (_, i) => ({
      ...mockBookings[0],
      id: `booking${i + 1}`,
      bookingReference: `REF${String(i + 1).padStart(3, '0')}`,
    }));

    render(<TodayBookings bookings={manyBookings} />);

    // Should show first 10 bookings by default
    expect(screen.getByText('REF001')).toBeInTheDocument();
    expect(screen.getByText('REF010')).toBeInTheDocument();
    expect(screen.queryByText('REF011')).not.toBeInTheDocument();
    
    // Should show "View all" link
    expect(screen.getByText('View all 20 bookings')).toBeInTheDocument();
  });

  it('should display booking times in correct order (newest first)', () => {
    const bookingsWithTimes = [
      { ...mockBookings[0], bookingTime: '09:00' },
      { ...mockBookings[1], bookingTime: '15:30' },
      { ...mockBookings[2], bookingTime: '12:15' },
    ];

    render(<TodayBookings bookings={bookingsWithTimes} />);

    const timeElements = screen.getAllByText(/\d{2}:\d{2}/);
    expect(timeElements[0]).toHaveTextContent('09:00');
    expect(timeElements[1]).toHaveTextContent('15:30');
    expect(timeElements[2]).toHaveTextContent('12:15');
  });
});