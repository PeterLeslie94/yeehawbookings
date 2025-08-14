'use client';

import React from 'react';
import { Check, Printer, Download, Plus } from 'lucide-react';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import { CustomerFormData } from '@/app/types/booking';

interface ConfirmationStepProps {
  bookingData: {
    bookingReference: string;
    bookingDate: string;
    totalAmount: number;
    finalAmount: number;
    discountAmount?: number;
    customerDetails: CustomerFormData;
    packages: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    extras: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    paymentConfirmation: {
      paymentIntentId: string;
      status: string;
      amount: number;
    };
  };
  onPrint?: () => void;
  onDownload?: () => void;
  onNewBooking?: () => void;
  onRetry?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  bookingData,
  onPrint,
  onDownload,
  onNewBooking,
  onRetry,
  isLoading = false,
  error = null
}) => {
  // Format date to user-friendly format
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  // Handle print with error handling
  const handlePrint = () => {
    try {
      if (onPrint) {
        onPrint();
      }
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  // Get current date for payment date
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-GB');
  };

  // Show loading overlay when loading
  if (isLoading) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center z-10">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Processing...</p>
        </div>
        <div className="opacity-50 pointer-events-none">
          {/* Render the main content but disabled */}
          <div 
            data-testid="confirmation-container" 
            className="max-w-4xl mx-auto px-4 sm:px-6"
            role="region" 
            aria-label="Booking confirmation"
          >
            <main 
              className="bg-white rounded-lg shadow-lg overflow-hidden"
              tabIndex={-1}
              role="main"
            >
              <div 
                data-testid="confirmation-content"
                className="print:text-black print:bg-white p-6 sm:p-8"
              >
                {/* Basic content structure for loading state */}
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div data-testid="success-icon" className="bg-green-100 p-3 rounded-full">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                  <p className="text-gray-600" aria-live="polite">
                    Your booking has been confirmed
                  </p>
                </div>

                {/* Action Buttons - always show but disabled when loading */}
                <div 
                  data-testid="action-buttons"
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  {onPrint && (
                    <button
                      disabled={true}
                      className="flex items-center justify-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Printer className="w-5 h-5" />
                      Print Confirmation
                    </button>
                  )}
                  
                  {onDownload && (
                    <button
                      disabled={true}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-5 h-5" />
                      Download PDF
                    </button>
                  )}
                  
                  {onNewBooking && (
                    <button
                      disabled={true}
                      className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                      Make Another Booking
                    </button>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div data-testid="error-container" className="bg-red-50 border border-red-200 rounded-md p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-700 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Handle missing booking data
  if (!bookingData) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 text-lg">Booking information unavailable</p>
      </div>
    );
  }

  // Handle missing customer details
  if (!bookingData.customerDetails) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 text-lg">Customer information unavailable</p>
      </div>
    );
  }

  // Handle payment failure
  const isPaymentFailed = bookingData.paymentConfirmation?.status === 'failed';

  return (
    <div 
      data-testid="confirmation-container" 
      className="max-w-4xl mx-auto px-4 sm:px-6"
      role="region" 
      aria-label="Booking confirmation"
    >
      <main 
        className="bg-white rounded-lg shadow-lg overflow-hidden"
        tabIndex={-1}
        role="main"
      >
        <div 
          data-testid="confirmation-content"
          className="print:text-black print:bg-white p-6 sm:p-8"
        >
          {/* Header with success message */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div data-testid="success-icon" className="bg-green-100 p-3 rounded-full">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
<p className="text-gray-600">
              Your booking has been confirmed
            </p>
            <p 
              className="text-gray-600 mt-1"
              aria-live="polite"
            >
              Booking confirmed successfully
            </p>
          </div>

          {/* Booking Reference */}
          <div 
            data-testid="booking-reference" 
            className="bg-gray-50 p-4 rounded-lg mb-6 text-lg sm:text-2xl"
            aria-label="Booking reference"
          >
<p className="text-sm font-medium text-gray-600 mb-2">Booking Reference:</p>
            <div 
              className={`text-2xl font-bold text-gray-900 break-all ${
                bookingData.bookingReference.length > 30 ? 'break-all' : ''
              }`}
              style={{ userSelect: 'text' }}
            >
              {bookingData.bookingReference || 'Reference not available'}
            </div>
          </div>

          {/* Booking Details */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Booking Information */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
              
              <div data-testid="booking-date" className="mb-4">
                <p className="text-sm text-gray-600">Event Date</p>
                <p className="font-medium">{formatDate(bookingData.bookingDate)}</p>
                <p className="text-sm text-gray-500">UK Time</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">Venue</p>
                <p className="font-medium">Country Days Nightclub</p>
              </div>
            </div>

            {/* Customer Information */}
            <div aria-label="Customer information">
              <h3 className="text-xl font-semibold mb-4">Customer Details</h3>
              
              <div data-testid="customer-name" className="mb-2">
                <p className="font-medium">
                  {bookingData.customerDetails.name || 'Customer information incomplete'}
                </p>
              </div>
              
              <div className="mb-2">
                <p className="text-gray-600">{bookingData.customerDetails.email}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600">{bookingData.customerDetails.phone}</p>
              </div>

              {bookingData.customerDetails.bookingNotes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Special Requests:</p>
                  <p className="text-gray-700 break-words">{bookingData.customerDetails.bookingNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Packages */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Selected Packages</h3>
            
            {bookingData.packages.length === 0 ? (
              <p className="text-gray-500">No packages selected</p>
            ) : (
              <div className="space-y-3">
                {bookingData.packages.map((pkg, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4" data-testid={`package-${pkg.name}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
<h4 className="font-medium truncate">{pkg.name}</h4>
                        <p className="text-sm text-gray-600">
                          Quantity: {pkg.quantity}
                          <span className="sr-only"> for {pkg.name}</span>
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium">{formatCurrency(pkg.price)} per person</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Extras */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Selected Extras</h3>
            
            {bookingData.extras.length === 0 ? (
              <p className="text-gray-500">No extras selected</p>
            ) : (
              <div className="space-y-3">
                {bookingData.extras.map((extra, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4" data-testid={`extra-${extra.name}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
<h4 className="font-medium">{extra.name}</h4>
                        <p className="text-sm text-gray-600">
                          Quantity: {extra.quantity}
                          <span className="sr-only"> for {extra.name}</span>
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium">{formatCurrency(extra.price)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Information */}
          <div className="border-t pt-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">Payment</h3>
            
            {/* Payment Summary */}
<div className="space-y-2 mb-6">
              <div className="text-gray-600">
                Subtotal {formatCurrency(bookingData.totalAmount)}
              </div>
              
              {bookingData.discountAmount && bookingData.discountAmount > 0 && (
                <>
                  <div className="text-green-600">
                    Discount -{formatCurrency(bookingData.discountAmount)}
                  </div>
                  {bookingData.customerDetails.promoCode && (
                    <div className="text-sm text-gray-500">
                      Promo code {bookingData.customerDetails.promoCode}
                    </div>
                  )}
                </>
              )}
              
              <div className="border-t pt-2">
                <div className="text-xl font-bold">
                  Total {formatCurrency(bookingData.finalAmount)}
                </div>
              </div>
            </div>

            {/* Payment Confirmation */}
            <div 
              data-testid="payment-confirmation"
              className="bg-green-50 border border-green-200 rounded-lg p-6"
              aria-label="Payment confirmation"
            >
              <h4 className="text-lg font-semibold text-green-800 mb-4">
                {isPaymentFailed ? 'Payment Failed' : 'Payment Confirmation'}
              </h4>
            
            {isPaymentFailed ? (
              <p className="text-red-600">Payment failed</p>
            ) : (
              <>
                <p className="text-green-700 mb-4">Payment confirmed</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-700">Payment Status:</span>
                    <span className="font-medium text-green-800 capitalize">
                      {bookingData.paymentConfirmation.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700">Amount Paid:</span>
                    <span className="font-medium text-green-800">
                      {formatCurrency(bookingData.paymentConfirmation.amount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700">Payment Method:</span>
                    <span className="font-medium text-green-800">Card</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700">Transaction ID:</span>
                    <span className="font-medium text-green-800 break-all">
                      {bookingData.paymentConfirmation.paymentIntentId}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700">Payment Date:</span>
                    <span className="font-medium text-green-800">{getCurrentDate()}</span>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          {/* Action Buttons */}
          <div 
            data-testid="action-buttons"
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {onPrint && (
              <button
                onClick={handlePrint}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-5 h-5" />
                Print Confirmation
              </button>
            )}
            
            {onDownload && (
              <button
                onClick={onDownload}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            )}
            
            {onNewBooking && (
              <button
                onClick={onNewBooking}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Make Another Booking
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConfirmationStep;