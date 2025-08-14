'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Edit2, DollarSign, Trash2, Calendar, User, CreditCard, Package, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { BookingStatus } from '@prisma/client';

interface BookingItem {
  id: string;
  itemType: 'PACKAGE' | 'EXTRA';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  package?: {
    id: string;
    name: string;
    description?: string;
    inclusions?: string[];
  } | null;
  extra?: {
    id: string;
    name: string;
    description?: string;
  } | null;
}

interface Booking {
  id: string;
  bookingReference: string;
  userId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  bookingDate: Date | string;
  status: BookingStatus;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  customerNotes?: string | null;
  stripePaymentId?: string | null;
  stripePaymentIntentId?: string | null;
  paidAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items: BookingItem[];
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  promoCode?: {
    id: string;
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
  } | null;
}

interface BookingDetailsModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onUpdate: (updatedBooking: Booking) => void;
  onRefund: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
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

export default function BookingDetailsModal({
  isOpen,
  booking,
  onClose,
  onUpdate,
  onRefund,
  onCancel,
}: BookingDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'payment' | 'history'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    guestName: '',
    guestEmail: '',
    customerNotes: '',
    status: 'PENDING' as BookingStatus,
  });

  useEffect(() => {
    if (booking) {
      setEditForm({
        guestName: booking.guestName || '',
        guestEmail: booking.guestEmail || '',
        customerNotes: booking.customerNotes || '',
        status: booking.status,
      });
    }
  }, [booking]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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
  }, [isOpen, onClose]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = useCallback(async () => {
    if (!booking) return;

    setError(null);

    // Validation
    if (editForm.guestEmail && !validateEmail(editForm.guestEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const validStatuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(editForm.status)) {
      setError('Invalid status value');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking');
      }

      onUpdate(data.data);
      setIsEditing(false);
      
    } catch (err: any) {
      setError(`Failed to update booking: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [booking, editForm, onUpdate]);

  const handleCancel = useCallback(() => {
    if (booking) {
      setEditForm({
        guestName: booking.guestName || '',
        guestEmail: booking.guestEmail || '',
        customerNotes: booking.customerNotes || '',
        status: booking.status,
      });
    }
    setIsEditing(false);
    setError(null);
  }, [booking]);

  if (!isOpen || !booking) {
    return null;
  }

  const isPaid = booking.paidAt && booking.stripePaymentId;
  const canEdit = booking.status !== 'CANCELLED';
  const canRefund = isPaid && booking.status !== 'CANCELLED';
  const canCancelBooking = booking.status !== 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        data-testid="modal-backdrop"
      />
      
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
              <p className="text-sm text-gray-500">Reference: {booking.bookingReference}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: User },
                { id: 'items', name: 'Items', icon: Package },
                { id: 'payment', name: 'Payment', icon: CreditCard },
                { id: 'history', name: 'History', icon: Clock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 active'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                    
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            id="guestName"
                            value={editForm.guestName}
                            onChange={(e) => setEditForm({ ...editForm, guestName: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">
                            Customer Email
                          </label>
                          <input
                            type="email"
                            id="guestEmail"
                            value={editForm.guestEmail}
                            onChange={(e) => setEditForm({ ...editForm, guestEmail: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700">
                            Customer Notes
                          </label>
                          <textarea
                            id="customerNotes"
                            value={editForm.customerNotes}
                            onChange={(e) => setEditForm({ ...editForm, customerNotes: e.target.value })}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <select
                            id="status"
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BookingStatus })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="REFUNDED">Refunded</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Name:</span>
                          <p className="text-sm font-medium text-gray-900">
                            {booking.guestName || booking.user?.name || 'Guest'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Email:</span>
                          <p className="text-sm text-gray-900">
                            {booking.guestEmail || booking.user?.email}
                          </p>
                        </div>
                        {booking.customerNotes && (
                          <div>
                            <span className="text-sm text-gray-500">Notes:</span>
                            <p className="text-sm text-gray-900">{booking.customerNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-500">Date:</span>
                        <p className="text-sm font-medium text-gray-900">{formatDate(booking.bookingDate)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Status:</span>
                        <div className="mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Created:</span>
                        <p className="text-sm text-gray-900">{formatDate(booking.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-sm font-medium">{formatCurrency(booking.totalAmount, booking.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <span className="text-sm font-medium">{formatCurrency(booking.discountAmount, booking.currency)}</span>
                    </div>
                    {booking.promoCode && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Promo Code:</span>
                        <span className="text-sm font-medium">{booking.promoCode.code}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-base font-medium text-gray-900">Total:</span>
                      <span className="text-base font-bold text-gray-900">{formatCurrency(booking.finalAmount, booking.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="space-y-4">
                {booking.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {item.package?.name || item.extra?.name}
                        </h4>
                        {(item.package?.description || item.extra?.description) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.package?.description || item.extra?.description}
                          </p>
                        )}
                        {item.package?.inclusions && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-700">Inclusions:</span>
                            <ul className="mt-1 space-y-1">
                              {item.package.inclusions.map((inclusion, index) => (
                                <li key={index} className="text-sm text-gray-600 ml-4">
                                  • {inclusion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Quantity: {item.quantity}</div>
                        <div className="text-sm text-gray-500">Unit Price: {formatCurrency(item.unitPrice, booking.currency)}</div>
                        <div className="text-lg font-medium text-gray-900">Total: {formatCurrency(item.totalPrice, booking.currency)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Payment Status:</span>
                      <span className="text-sm font-medium">
                        {isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    {booking.stripePaymentId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Payment ID:</span>
                        <span className="text-sm font-medium">{booking.stripePaymentId}</span>
                      </div>
                    )}
                    {booking.paidAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Paid on:</span>
                        <span className="text-sm font-medium">{formatDate(booking.paidAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flow-root">
                  <ul className="-mb-8">
                    <li>
                      <div className="relative pb-8">
                        <div className="relative flex space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5">
                            <div>
                              <p className="text-sm text-gray-500">
                                <span className="font-medium text-gray-900">Booking created</span>
                                <span className="ml-2">{formatDate(booking.createdAt)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    {booking.paidAt && (
                      <li>
                        <div className="relative">
                          <div className="relative flex space-x-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                              <CreditCard className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5">
                              <div>
                                <p className="text-sm text-gray-500">
                                  <span className="font-medium text-gray-900">Payment confirmed</span>
                                  <span className="ml-2">{formatDate(booking.paidAt)}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-between border-t pt-6">
            <div>
              {isEditing ? (
                <div className="flex space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={!canEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Edit Booking
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => onRefund(booking)}
                disabled={!canRefund}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Process Refund
              </button>
              <button
                onClick={() => onCancel(booking)}
                disabled={!canCancelBooking}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}