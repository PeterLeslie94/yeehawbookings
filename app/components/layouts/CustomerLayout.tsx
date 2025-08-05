'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import BaseLayout from './BaseLayout';
import Header from '@/app/components/navigation/Header';
import Footer from '@/app/components/navigation/Footer';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';

interface CustomerLayoutProps {
  children: React.ReactNode;
  showProgress?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export default function CustomerLayout({ 
  children, 
  showProgress = false, 
  currentStep = 1, 
  totalSteps = 5 
}: CustomerLayoutProps) {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <BaseLayout isLoading={true}>
        <LoadingSpinner />
      </BaseLayout>
    );
  }

  const progressPercentage = showProgress ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className="customer-layout">
      <BaseLayout>
        <Header />
        
        {showProgress && (
          <div data-testid="booking-progress" className="bg-gray-50 border-b">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  role="progressbar"
                  aria-valuenow={progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )}
        
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        
        <Footer />
      </BaseLayout>
    </div>
  );
}