'use client';

import { useState } from 'react';
import DateSelection from '@/app/components/booking/DateSelection';
import PackageSelection from '@/app/components/booking/PackageSelection';
import ExtraSelection from '@/app/components/booking/ExtraSelection';
import { CustomerDetails } from '@/app/components/booking/CustomerDetails';
import { PaymentStep } from '@/app/components/booking/PaymentStep';
import ConfirmationStep from '@/app/components/booking/ConfirmationStep';
import { SelectedDate, SelectedExtra, CustomerFormData } from '@/app/types/booking';

type BookingStep = 'date' | 'packages' | 'extras' | 'details' | 'payment' | 'confirmation';

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState<BookingStep>('date');
  const [selectedDate, setSelectedDate] = useState<SelectedDate | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<{ packageId: number; quantity: number; price: number; name?: string }[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerFormData | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  
  // Confirmation step state
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);

  const handleDateSelect = (date: SelectedDate) => {
    setSelectedDate(date);
    setCurrentStep('packages');
  };

  const handlePackageSelect = (packages: { packageId: number; quantity: number; price: number; name?: string }[]) => {
    setSelectedPackages(packages);
    setCurrentStep('extras');
  };

  const handleExtrasSelect = (extras: SelectedExtra[]) => {
    setSelectedExtras(extras);
    setCurrentStep('details');
  };

  const handleDetailsSubmit = async (details: CustomerFormData) => {
    setCustomerDetails(details);
    
    try {
      // Create a booking in the database
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate?.date,
          packages: selectedPackages,
          extras: selectedExtras,
          customer: details,
          totalAmount: calculateTotalWithDiscount(details.promoCodeData),
          currency: 'usd',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const booking = await response.json();
      setBookingId(booking.id);
      setCurrentStep('payment');
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    }
  };

  const calculateSubtotal = () => {
    const packagesTotal = selectedPackages.reduce((sum, pkg) => sum + (pkg.price * pkg.quantity), 0);
    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.totalPrice, 0);
    return packagesTotal + extrasTotal;
  };

  const calculateTotalWithDiscount = (promoCodeData?: { 
    discountType: 'percentage' | 'fixed_amount'; 
    discountValue: number 
  }) => {
    const subtotal = calculateSubtotal();
    if (!promoCodeData) return subtotal;

    if (promoCodeData.discountType === 'percentage') {
      return Math.round(subtotal * (1 - promoCodeData.discountValue / 100));
    } else {
      return Math.max(0, subtotal - promoCodeData.discountValue);
    }
  };

  const handlePaymentComplete = async (data: { paymentIntentId: string }) => {
    setPaymentIntentId(data.paymentIntentId);
    setConfirmationLoading(true);
    setConfirmationError(null);
    
    try {
      // Call confirmation API
      const response = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId,
          paymentIntentId: data.paymentIntentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm booking');
      }

      const confirmationData = await response.json();
      setConfirmedBooking(confirmationData);
      setCurrentStep('confirmation');
    } catch (error) {
      console.error('Confirmation error:', error);
      setConfirmationError(error instanceof Error ? error.message : 'Failed to confirm booking');
    } finally {
      setConfirmationLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'date', label: 'Select Date' },
      { id: 'packages', label: 'Choose Package' },
      { id: 'extras', label: 'Add Extras' },
      { id: 'details', label: 'Your Details' },
      { id: 'payment', label: 'Payment' },
      { id: 'confirmation', label: 'Confirmation' },
    ];

    return (
      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex-1 text-center"
            >
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : steps.findIndex(s => s.id === currentStep) > index
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {steps.findIndex(s => s.id === currentStep) > index ? '✓' : index + 1}
              </div>
              <p className="text-xs mt-1">{step.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'date':
        return (
          <DateSelection
            onDateSelect={handleDateSelect}
            initialDate={selectedDate?.date}
          />
        );
      
      case 'packages':
        return selectedDate ? (
          <PackageSelection
            selectedDate={selectedDate.date}
            onNext={handlePackageSelect}
            onBack={handleBack}
            initialPackages={selectedPackages}
          />
        ) : null;
      
      case 'extras':
        return selectedDate ? (
          <ExtraSelection
            selectedDate={selectedDate.date}
            onExtrasSelect={handleExtrasSelect}
            initialExtras={selectedExtras}
          />
        ) : null;
      
      case 'details':
        return selectedDate ? (
          <CustomerDetails
            onDetailsSubmit={handleDetailsSubmit}
            selectedDate={selectedDate.date}
            subtotal={calculateSubtotal()}
            initialDetails={customerDetails || undefined}
          />
        ) : null;
      
      case 'payment':
        return bookingId && customerDetails ? (
          <PaymentStep
            bookingId={bookingId}
            totalAmount={calculateTotalWithDiscount(customerDetails.promoCodeData)}
            currency="USD"
            originalAmount={customerDetails.promoCodeData ? calculateSubtotal() : undefined}
            discountAmount={customerDetails.promoCodeData ? 
              calculateSubtotal() - calculateTotalWithDiscount(customerDetails.promoCodeData) : undefined}
            promoCode={customerDetails.promoCode || undefined}
            onComplete={handlePaymentComplete}
            onBack={() => setCurrentStep('details')}
          />
        ) : null;
      
      case 'confirmation':
        if (confirmationError) {
          return (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-md p-6">
                <h2 className="text-xl font-semibold text-red-800 mb-2">Booking Confirmation Failed</h2>
                <p className="text-red-700 mb-4">{confirmationError}</p>
                <button
                  onClick={() => {
                    setConfirmationError(null);
                    handlePaymentComplete({ paymentIntentId: paymentIntentId! });
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-4"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Return to Home
                </button>
              </div>
            </div>
          );
        }
        
        if (confirmedBooking && selectedDate && customerDetails) {
          // Transform data for ConfirmationStep component
          const bookingData = {
            bookingReference: confirmedBooking.booking.bookingReference,
            bookingDate: selectedDate.date,
            totalAmount: calculateSubtotal(),
            finalAmount: calculateTotalWithDiscount(customerDetails.promoCodeData),
            discountAmount: customerDetails.promoCodeData ? 
              calculateSubtotal() - calculateTotalWithDiscount(customerDetails.promoCodeData) : undefined,
            customerDetails: customerDetails,
            packages: selectedPackages.map(pkg => ({
              id: pkg.packageId.toString(),
              name: pkg.name || `Package ${pkg.packageId}`,
              quantity: pkg.quantity,
              price: pkg.price
            })),
            extras: selectedExtras.map(extra => ({
              id: extra.id,
              name: extra.name,
              quantity: extra.quantity,
              price: extra.price
            })),
            paymentConfirmation: {
              paymentIntentId: confirmedBooking.paymentConfirmation.paymentIntentId,
              status: confirmedBooking.paymentConfirmation.status,
              amount: confirmedBooking.paymentConfirmation.amount / 100 // Convert from cents to dollars
            }
          };
          
          return (
            <ConfirmationStep
              bookingData={bookingData}
              onPrint={() => window.print()}
              onNewBooking={() => {
                // Reset all state and go back to date selection
                setCurrentStep('date');
                setSelectedDate(null);
                setSelectedPackages([]);
                setSelectedExtras([]);
                setCustomerDetails(null);
                setBookingId(null);
                setPaymentIntentId(null);
                setConfirmedBooking(null);
                setConfirmationError(null);
              }}
              isLoading={confirmationLoading}
              error={confirmationError}
            />
          );
        }
        
        // Loading state or no confirmed booking data
        return (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Confirming Your Booking...</h2>
            <p className="text-gray-600">Please wait while we process your booking confirmation.</p>
          </div>
        );
      
      default:
        return <div>Step not implemented</div>;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'packages':
        setCurrentStep('date');
        break;
      case 'extras':
        setCurrentStep('packages');
        break;
      case 'details':
        setCurrentStep('extras');
        break;
      case 'payment':
        setCurrentStep('details');
        break;
      default:
        break;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Book Your Night Out</h1>
      
      {renderStepIndicator()}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {currentStep !== 'date' && (
          <button
            onClick={handleBack}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Back
          </button>
        )}
        
        {renderCurrentStep()}
      </div>
      
      {selectedDate && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            Selected date: <strong>{selectedDate.formattedDate}</strong>
          </p>
        </div>
      )}
    </div>
  );
}