'use client';

import React, { useState } from 'react';
import { RefreshCcw, User, Clock, Package } from 'lucide-react';
import { TodayBookingsProps } from '@/app/types/admin';
import { BookingStatus } from '@prisma/client';

const getStatusBadgeClasses = (status: BookingStatus) => {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return 'bg-green-100 text-green-800';
    case BookingStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case BookingStatus.CANCELLED:
      return 'bg-red-100 text-red-800';
    case BookingStatus.REFUNDED:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatCurrency = (amount: number) => {
  return `£${amount.toFixed(2)}`;
};

export default function TodayBookings({
  bookings,
  loading = false,
  error,
  onRefresh,
}: TodayBookingsProps) {
  const [showAll, setShowAll] = useState(false);
  const displayLimit = 10;
  const displayedBookings = showAll ? bookings : bookings.slice(0, displayLimit);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Today's Bookings</h3>
          <div className="animate-pulse">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse border border-gray-200 rounded-lg p-4"
                data-testid="booking-skeleton"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Today's Bookings</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label="Refresh bookings"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="p-6 text-center">
          <div className="text-red-600">
            <p className="font-medium mb-1">Error loading bookings</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Today's Bookings</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label="Refresh bookings"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-lg font-medium text-gray-900 mb-1">No bookings today</p>
          <p className="text-gray-500">There are no bookings scheduled for today.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Today's Bookings</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Refresh bookings"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {displayedBookings.map((booking) => (
            <div
              key={booking.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{booking.bookingReference}</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(
                      booking.status
                    )}`}
                  >
                    {booking.status}
                  </span>
                </div>
                <span className="font-bold text-gray-900">
                  {formatCurrency(booking.finalAmount)}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <User className="h-4 w-4 mr-1" />
                <span className="mr-4">{booking.customerName}</span>
                <Clock className="h-4 w-4 mr-1" />
                <span>{booking.bookingTime}</span>
              </div>
              
              <div className="text-sm text-gray-500 mb-1">
                {booking.customerEmail}
              </div>
              
              <div className="flex items-center flex-wrap gap-2">
                {booking.packages.map((pkg, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {pkg.name} ({pkg.quantity})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {bookings.length > displayLimit && !showAll && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all {bookings.length} bookings
            </button>
          </div>
        )}
        
        {showAll && bookings.length > displayLimit && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(false)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Show fewer bookings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}