'use client';

import { useState } from 'react';
import DateSelection from '@/app/components/booking/DateSelection';
import PackageSelection from '@/app/components/booking/PackageSelection';
import ExtraSelection from '@/app/components/booking/ExtraSelection';
import { CustomerDetails } from '@/app/components/booking/CustomerDetails';
import { SelectedDate, SelectedExtra, CustomerFormData } from '@/app/types/booking';

type BookingStep = 'date' | 'packages' | 'extras' | 'details' | 'payment' | 'confirmation';

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState<BookingStep>('date');
  const [selectedDate, setSelectedDate] = useState<SelectedDate | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<{ packageId: number; quantity: number; price: number }[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerFormData | null>(null);

  const handleDateSelect = (date: SelectedDate) => {
    setSelectedDate(date);
    setCurrentStep('packages');
  };

  const handlePackageSelect = (packages: { packageId: number; quantity: number; price: number }[]) => {
    setSelectedPackages(packages);
    setCurrentStep('extras');
  };

  const handleExtrasSelect = (extras: SelectedExtra[]) => {
    setSelectedExtras(extras);
    setCurrentStep('details');
  };

  const handleDetailsSubmit = async (details: CustomerFormData) => {
    setCustomerDetails(details);
    // TODO: Move to payment step
    console.log('Booking details:', {
      date: selectedDate,
      packages: selectedPackages,
      extras: selectedExtras,
      customer: details
    });
    alert('Booking flow complete! Payment integration coming soon.');
  };

  const calculateSubtotal = () => {
    const packagesTotal = selectedPackages.reduce((sum, pkg) => sum + (pkg.price * pkg.quantity), 0);
    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.totalPrice, 0);
    return packagesTotal + extrasTotal;
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'date', label: 'Select Date' },
      { id: 'packages', label: 'Choose Package' },
      { id: 'extras', label: 'Add Extras' },
      { id: 'details', label: 'Your Details' },
      { id: 'payment', label: 'Payment', disabled: true }, // TODO: Enable when implemented
    ];

    return (
      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 text-center ${
                step.disabled ? 'opacity-50' : ''
              }`}
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
            maxGuests={50}
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