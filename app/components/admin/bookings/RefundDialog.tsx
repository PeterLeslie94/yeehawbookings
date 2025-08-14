'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { BookingStatus } from '@prisma/client';

interface BookingItem {
  id: string;
  quantity: number;
  totalPrice: number;
  package?: { name: string } | null;
}

interface Booking {
  id: string;
  bookingReference: string;
  guestName?: string | null;
  guestEmail?: string | null;
  status: BookingStatus;
  finalAmount: number;
  currency: string;
  paidAt?: Date | string | null;
  refundAmount?: number | null;
  items: BookingItem[];
}

interface RefundDialogProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSuccess: (updatedBooking: Booking) => void;
}

const formatCurrency = (amount: number, currency: string = 'gbp') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export default function RefundDialog({
  isOpen,
  booking,
  onClose,
  onSuccess,
}: RefundDialogProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (booking && isOpen) {
      setRefundAmount(booking.finalAmount / 100); // Convert from cents
      setRefundReason('');
      setError(null);
      setShowConfirmation(false);
      setShowSuccess(false);
      setRefundType('full');
    }
  }, [booking, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onClose]);

  const handleRefundTypeChange = useCallback((type: 'full' | 'partial') => {
    setRefundType(type);
    if (type === 'full' && booking) {
      setRefundAmount(booking.finalAmount / 100);
    } else if (type === 'partial') {
      setRefundAmount(0);
    }
  }, [booking]);

  const validateForm = useCallback(() => {
    if (!refundReason.trim()) {
      setError('Refund reason is required');
      return false;
    }

    if (refundAmount <= 0) {
      setError('Refund amount must be positive');
      return false;
    }

    if (booking && refundAmount > (booking.finalAmount / 100)) {
      setError(`Amount cannot exceed ${formatCurrency(booking.finalAmount, booking.currency)}`);
      return false;
    }

    return true;
  }, [refundAmount, refundReason, booking]);

  const handleProcessRefund = useCallback(() => {
    if (!validateForm()) return;
    setShowConfirmation(true);
  }, [validateForm]);

  const handleConfirmRefund = useCallback(async () => {
    if (!booking) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: refundAmount,
          reason: refundReason,
          type: refundType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      setShowConfirmation(false);
      setShowSuccess(true);
      onSuccess(data.data);

      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 3000);

    } catch (err: any) {
      setError(`Failed to process refund: ${err.message}`);
      setShowConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  }, [booking, refundAmount, refundReason, refundType, onSuccess, onClose]);

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  if (!isOpen || !booking) {
    return null;
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Refund Processed Successfully
              </h3>
              <p className="text-sm text-gray-600">
                The refund of {formatCurrency(refundAmount * 100, booking.currency)} has been processed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Confirm Refund</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to refund {formatCurrency(refundAmount * 100, booking.currency)}?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelConfirmation}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRefund}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={!isLoading ? onClose : undefined} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Process Refund</h2>
              <p className="text-sm text-gray-500">
                {booking.bookingReference} - {booking.guestName}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-500 disabled:cursor-not-allowed"
              aria-label="Close dialog"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Booking Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Booking Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer:</span>
                <p className="font-medium">{booking.guestName}</p>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <p className="font-medium">{booking.guestEmail}</p>
              </div>
              <div>
                <span className="text-gray-500">Total Amount:</span>
                <p className="font-medium">{formatCurrency(booking.finalAmount, booking.currency)}</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <p className="font-medium">{booking.status}</p>
              </div>
            </div>
          </div>

          {/* Refund Type */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Refund Type</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="refundType"
                  value="full"
                  checked={refundType === 'full'}
                  onChange={() => handleRefundTypeChange('full')}
                  className="mr-3 text-blue-600"
                />
                <span className="text-sm text-gray-900">Full Refund</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="refundType"
                  value="partial"
                  checked={refundType === 'partial'}
                  onChange={() => handleRefundTypeChange('partial')}
                  className="mr-3 text-blue-600"
                />
                <span className="text-sm text-gray-900">Partial Refund</span>
              </label>
            </div>
          </div>

          {/* Refund Amount */}
          <div className="mb-6">
            <label htmlFor="refundAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Refund Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="number"
                id="refundAmount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                disabled={refundType === 'full'}
                min="0"
                max={booking.finalAmount / 100}
                step="0.01"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            {refundType === 'full' && (
              <p className="text-xs text-gray-500 mt-1">
                Full refund amount is automatically set to the total booking amount
              </p>
            )}
          </div>

          {/* Refund Reason */}
          <div className="mb-6">
            <label htmlFor="refundReason" className="block text-sm font-medium text-gray-700 mb-2">
              Refund Reason *
            </label>
            <textarea
              id="refundReason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              placeholder="Please provide a reason for this refund..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Refund Preview */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Refund Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Amount to refund:</span>
                <span className="font-medium text-blue-900">
                  {formatCurrency(refundAmount * 100, booking.currency)}
                </span>
              </div>
              {refundType === 'partial' && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Remaining amount:</span>
                  <span className="font-medium text-blue-900">
                    {formatCurrency((booking.finalAmount / 100 - refundAmount) * 100, booking.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-blue-700">Refund method:</span>
                <span className="font-medium text-blue-900">Original payment method</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Processing time:</span>
                <span className="font-medium text-blue-900">5-10 business days</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessRefund}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}