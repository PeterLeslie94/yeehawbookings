'use client';

import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, RefreshCw, Eye, DollarSign } from 'lucide-react';
import { BookingStatus } from '@prisma/client';

interface BookingItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  package?: { name: string } | null;
  extra?: { name: string } | null;
}

interface Booking {
  id: string;
  bookingReference: string;
  guestName?: string | null;
  guestEmail?: string | null;
  bookingDate: Date | string;
  status: BookingStatus;
  finalAmount: number;
  currency: string;
  createdAt: Date | string;
  items: BookingItem[];
  user?: { name?: string | null; email?: string | null } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BookingsTableProps {
  bookings: Booking[];
  pagination: Pagination;
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onRefresh?: () => void;
  onEdit?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  onRefund?: (booking: Booking) => void;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  onRowClick?: (booking: Booking) => void;
}

const formatCurrency = (amount: number, currency: string = 'gbp') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'd MMM yyyy');
};

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800';
    case 'REFUNDED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function BookingsTable({
  bookings,
  pagination,
  loading = false,
  sortBy,
  sortOrder,
  onRefresh,
  onEdit,
  onCancel,
  onRefund,
  onSort,
  onRowClick,
}: BookingsTableProps) {
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());

  const handleSort = useCallback((field: string) => {
    if (!onSort) return;
    
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, newOrder);
  }, [sortBy, sortOrder, onSort]);

  const handleSelectAll = useCallback(() => {
    if (selectedBookings.size === bookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(bookings.map(b => b.id)));
    }
  }, [bookings, selectedBookings.size]);

  const handleSelectBooking = useCallback((bookingId: string) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId);
    } else {
      newSelected.add(bookingId);
    }
    setSelectedBookings(newSelected);
  }, [selectedBookings]);

  const handleRowClick = useCallback((booking: Booking, event: React.MouseEvent) => {
    // Don't trigger row click if user clicked on action buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    onRowClick?.(booking);
  }, [onRowClick]);

  const handleKeyDown = useCallback((booking: Booking, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(booking);
    }
  }, [onRowClick]);

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading bookings...</span>
        </div>
        <div role="progressbar" aria-label="Loading" className="sr-only">Loading</div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
        <p className="text-gray-600">There are currently no bookings to display.</p>
      </div>
    );
  }

  const startIndex = (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* Bulk actions bar */}
      {selectedBookings.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedBookings.size} booking{selectedBookings.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Cancel Selected
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Export Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedBookings.size === bookings.length && bookings.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('bookingReference')}
              >
                Reference {renderSortIcon('bookingReference')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('guestName')}
              >
                Customer {renderSortIcon('guestName')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('bookingDate')}
              >
                Booking Date {renderSortIcon('bookingDate')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status {renderSortIcon('status')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('finalAmount')}
              >
                Amount {renderSortIcon('finalAmount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr
                key={booking.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={(e) => handleRowClick(booking, e)}
                onKeyDown={(e) => handleKeyDown(booking, e)}
                tabIndex={0}
                role="button"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedBookings.has(booking.id)}
                    onChange={() => handleSelectBooking(booking.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.bookingReference}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {booking.guestName || booking.user?.name || 'Guest'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {booking.guestEmail || booking.user?.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(booking.bookingDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(booking.finalAmount, booking.currency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(booking);
                      }}
                      disabled={booking.status === 'CANCELLED'}
                      className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      aria-label="Edit booking"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefund?.(booking);
                      }}
                      disabled={booking.status === 'PENDING' || booking.status === 'CANCELLED'}
                      className="text-green-600 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      aria-label="Refund booking"
                    >
                      <DollarSign className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel?.(booking);
                      }}
                      disabled={booking.status === 'CANCELLED'}
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      aria-label="Cancel booking"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex}-{endIndex} of {pagination.total} bookings
          </div>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Refresh bookings"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}