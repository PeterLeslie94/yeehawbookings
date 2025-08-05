'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerDetailsProps, CustomerFormData } from '@/app/types/booking';

export function CustomerDetails({
  onDetailsSubmit,
  selectedDate,
  subtotal,
  initialDetails,
  className = '',
}: CustomerDetailsProps) {
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CustomerFormData>({
    name: initialDetails?.name || '',
    email: initialDetails?.email || '',
    phone: initialDetails?.phone || '',
    bookingNotes: initialDetails?.bookingNotes || '',
    isGuest: initialDetails?.isGuest !== undefined ? initialDetails.isGuest : true,
    promoCode: initialDetails?.promoCode || null,
    discount: initialDetails?.discount || 0,
    finalAmount: subtotal,
  });

  const [promoInput, setPromoInput] = useState('');

  // Pre-fill form for authenticated users
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || prev.name,
        email: session.user.email || prev.email,
        isGuest: false,
      }));
    }
  }, [session]);

  // Update final amount when discount changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      finalAmount: subtotal - prev.discount,
    }));
  }, [subtotal, formData.discount]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone) || formData.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Please enter a valid phone number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;

    setIsValidatingPromo(true);
    setPromoError(null);
    setPromoSuccess(false);

    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoInput,
          subtotal,
          bookingDate: selectedDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPromoError(data.error || 'Invalid or expired promo code');
        return;
      }

      setFormData(prev => ({
        ...prev,
        promoCode: data.code,
        discount: data.discountAmount,
      }));
      setPromoSuccess(true);
    } catch (error) {
      setPromoError('Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setFormData(prev => ({
      ...prev,
      promoCode: null,
      discount: 0,
    }));
    setPromoInput('');
    setPromoSuccess(false);
    setPromoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    try {
      await onDetailsSubmit(formData);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isProcessing}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isProcessing}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isProcessing}
            />
            {formErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
            )}
          </div>

          <div>
            <label htmlFor="bookingNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Booking Notes (Optional)
            </label>
            <textarea
              id="bookingNotes"
              value={formData.bookingNotes}
              onChange={(e) => handleInputChange('bookingNotes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any special requests or notes for your booking..."
              disabled={isProcessing}
            />
          </div>

          {!session && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isGuest"
                checked={formData.isGuest}
                onChange={(e) => handleInputChange('isGuest', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isProcessing}
              />
              <label htmlFor="isGuest" className="ml-2 block text-sm text-gray-900">
                Continue as guest
              </label>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="space-y-3">
            {!formData.promoCode ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing || isValidatingPromo}
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={isProcessing || isValidatingPromo || !promoInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isValidatingPromo ? 'Validating...' : 'Apply'}
                  </button>
                </div>
                {promoError && (
                  <p className="mt-1 text-sm text-red-600">{promoError}</p>
                )}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-green-800">
                    Promo code applied: <strong>{formData.promoCode}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-sm text-red-600 hover:text-red-800"
                    disabled={isProcessing}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              {formData.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-£{formData.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>£{formData.finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          {!session && !formData.isGuest && (
            <p className="text-sm text-gray-600 mb-4">
              Already have an account? <a href="/auth/login" className="text-blue-600 hover:underline">Sign in</a>
            </p>
          )}
          {!session && formData.isGuest && (
            <p className="text-sm text-gray-600 mb-4">
              You can create an account after booking to manage your reservations.
            </p>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Continue to Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}