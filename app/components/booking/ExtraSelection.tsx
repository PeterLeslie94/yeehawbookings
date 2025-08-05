'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, Package } from 'lucide-react';
import { ExtraSelectionProps, Extra, SelectedExtra, ExtraAvailabilityResponse } from '@/app/types/booking';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import ErrorMessage from '@/app/components/ui/ErrorMessage';

const ExtraSelection: React.FC<ExtraSelectionProps> = ({ 
  selectedDate, 
  onExtrasSelect,
  initialExtras,
  className = '' 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<Map<string, SelectedExtra>>(() => {
    // Initialize with initial extras if provided
    if (initialExtras && initialExtras.length > 0) {
      const initialMap = new Map<string, SelectedExtra>();
      initialExtras.forEach(extra => {
        initialMap.set(extra.id, extra);
      });
      return initialMap;
    }
    return new Map();
  });

  // Fetch extras with availability
  useEffect(() => {
    if (selectedDate) {
      fetchExtras();
    }
  }, [selectedDate]);

  const fetchExtras = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/extras/availability?date=${selectedDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch extras');
      }

      const data: ExtraAvailabilityResponse = await response.json();
      setExtras(data.extras);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading extras');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = useCallback((extra: Extra, delta: number) => {
    const currentQuantity = selectedExtras.get(extra.id)?.quantity || 0;
    const newQuantity = Math.max(0, currentQuantity + delta);
    
    // Don't exceed available quantity
    const maxQuantity = extra.availability?.availableQuantity || 0;
    const finalQuantity = Math.min(newQuantity, maxQuantity);

    if (finalQuantity === 0) {
      // Remove from selection
      const newSelection = new Map(selectedExtras);
      newSelection.delete(extra.id);
      setSelectedExtras(newSelection);
    } else {
      // Update selection
      const newSelection = new Map(selectedExtras);
      newSelection.set(extra.id, {
        id: extra.id,
        name: extra.name,
        price: extra.price,
        quantity: finalQuantity,
        totalPrice: finalQuantity * extra.price,
      });
      setSelectedExtras(newSelection);
    }
  }, [selectedExtras]);

  // Update parent component when selection changes
  useEffect(() => {
    const extrasArray = Array.from(selectedExtras.values());
    onExtrasSelect(extrasArray);
  }, [selectedExtras, onExtrasSelect]);

  const calculateTotal = () => {
    return Array.from(selectedExtras.values()).reduce((sum, extra) => sum + extra.totalPrice, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Loading available extras...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={`Error loading extras: ${error}`}
        onRetry={fetchExtras}
      />
    );
  }

  return (
    <div className={`extra-selection ${className}`} role="region" aria-label="Extra selection">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Select Extras</h2>
        
        {extras.length === 0 ? (
          <p className="text-gray-600">No extras available for this date.</p>
        ) : (
          <div className="space-y-4">
            {extras.map(extra => {
              const selectedQuantity = selectedExtras.get(extra.id)?.quantity || 0;
              const isAvailable = extra.availability?.isAvailable || false;
              const availableQuantity = extra.availability?.availableQuantity || 0;

              return (
                <div 
                  key={extra.id} 
                  data-testid={`extra-item-${extra.id}`}
                  className={`border rounded-lg p-4 ${!isAvailable ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{extra.name}</h3>
                      {extra.description && (
                        <p className="text-gray-600 text-sm mt-1">{extra.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xl font-bold">{formatPrice(extra.price)}</span>
                        <span className="text-sm text-gray-600">
                          {isAvailable ? `${availableQuantity} available` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(extra, -1)}
                        disabled={!isAvailable || selectedQuantity === 0}
                        className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label={`Decrease quantity for ${extra.name}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      
                      <span 
                        data-testid={`quantity-${extra.id}`}
                        className="w-12 text-center font-semibold"
                      >
                        {selectedQuantity}
                      </span>
                      
                      <button
                        onClick={() => updateQuantity(extra, 1)}
                        disabled={!isAvailable || selectedQuantity >= availableQuantity}
                        className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label={`Increase quantity for ${extra.name}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {selectedQuantity > 0 && (
                    <div className="mt-2 text-right text-sm text-gray-600">
                      Subtotal: {formatPrice(selectedQuantity * extra.price)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Total Section */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">Total: {formatPrice(calculateTotal())}</span>
          </div>
        </div>

        {/* Screen reader announcement */}
        <div className="sr-only" role="status" aria-live="polite" aria-label="Quantity updated">
          {Array.from(selectedExtras.values()).map(extra => (
            <span key={extra.id}>
              {extra.name}: {extra.quantity} selected
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExtraSelection;