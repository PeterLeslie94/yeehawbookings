'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, Package, Info, X } from 'lucide-react';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import ErrorMessage from '@/app/components/ui/ErrorMessage';

interface Package {
  id: number;
  name: string;
  description: string;
  defaultPrice: number;
  maxGuests: number;
  inclusions: string[];
  isActive: boolean;
}

interface PackagePricing {
  packageId: number;
  date: string;
  price: number;
}

interface PackageAvailability {
  packageId: number;
  date: string;
  availableQuantity: number;
  totalSpots: number;
}

interface SelectedPackage {
  packageId: number;
  quantity: number;
  price: number;
  name?: string;
}

interface PackageSelectionProps {
  selectedDate: string;
  onNext: (packages: SelectedPackage[]) => void;
  onBack: () => void;
  initialPackages?: SelectedPackage[];
  className?: string;
}

interface PackageModalProps {
  package: Package;
  price: number;
  isOpen: boolean;
  onClose: () => void;
}

const PackageModal: React.FC<PackageModalProps> = ({ package: pkg, price, isOpen, onClose }) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby={`modal-title-${pkg.id}`}
        tabIndex={-1}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 id={`modal-title-${pkg.id}`} className="text-xl font-semibold">
            {pkg.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">{pkg.description}</p>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">Package Includes:</h4>
          <ul className="list-disc list-inside space-y-1">
            {pkg.inclusions && pkg.inclusions.map((item, index) => (
              <li key={index} className="text-gray-600">{item}</li>
            ))}
          </ul>
        </div>
        
        <div className="border-t pt-4">
          <p className="text-lg font-semibold">
            {price !== undefined ? `£${price.toFixed(2)} per person` : 'Price TBD'}
          </p>
          <p className="text-sm text-gray-500">
            Maximum {pkg.maxGuests} guests
          </p>
        </div>
      </div>
    </div>
  );
};

const PackageSelection: React.FC<PackageSelectionProps> = ({
  selectedDate,
  onNext,
  onBack,
  initialPackages = [],
  className = ''
}) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [pricing, setPricing] = useState<Map<number, number>>(new Map());
  const [availability, setAvailability] = useState<Map<number, PackageAvailability>>(new Map());
  const [selectedPackages, setSelectedPackages] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModal, setSelectedModal] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize selected packages from props
  useEffect(() => {
    if (initialPackages.length > 0) {
      const initialMap = new Map();
      initialPackages.forEach(pkg => {
        initialMap.set(pkg.packageId, pkg.quantity);
      });
      setSelectedPackages(initialMap);
    }
  }, [initialPackages]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!selectedDate) {
      setError('Invalid configuration');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch packages, pricing, and availability in parallel
      const [packagesRes, pricingRes, availabilityRes] = await Promise.all([
        fetch('/api/packages'),
        fetch(`/api/packages/pricing?date=${selectedDate}`),
        fetch(`/api/packages/availability?date=${selectedDate}`)
      ]);

      if (!packagesRes.ok) throw new Error('Failed to load packages');

      const packagesData = await packagesRes.json();
      const packagesArray = packagesData.packages || [];
      setPackages(packagesArray);

      // Handle pricing
      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        const pricingMap = new Map();
        (pricingData.pricing || []).forEach((p: PackagePricing) => {
          pricingMap.set(p.packageId, p.price);
        });
        setPricing(pricingMap);
      }

      // Handle availability
      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        const availMap = new Map();
        (availabilityData.availability || []).forEach((a: PackageAvailability) => {
          availMap.set(a.packageId, a);
        });
        setAvailability(availMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate total guests
  const totalGuests = Array.from(selectedPackages.entries()).reduce(
    (sum, [_, quantity]) => sum + quantity, 
    0
  );

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    selectedPackages.forEach((quantity, packageId) => {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        const price = pricing.get(packageId) || pkg.defaultPrice;
        total += price * quantity;
      }
    });
    return total;
  };

  // Handle quantity change
  const handleQuantityChange = (packageId: number, delta: number) => {
    const currentQuantity = selectedPackages.get(packageId) || 0;
    const newQuantity = Math.max(0, currentQuantity + delta);
    
    // Check availability (only limit by actual package availability)
    const pkgAvailability = availability.get(packageId);
    const maxAvailable = pkgAvailability ? pkgAvailability.availableQuantity : Infinity;
    
    const finalQuantity = Math.min(newQuantity, maxAvailable);
    
    if (finalQuantity === 0) {
      const newMap = new Map(selectedPackages);
      newMap.delete(packageId);
      setSelectedPackages(newMap);
    } else {
      setSelectedPackages(new Map(selectedPackages.set(packageId, finalQuantity)));
    }
    
    setValidationError(null);
  };

  // Handle direct input
  const handleQuantityInput = (packageId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    handleQuantityChange(packageId, numValue - (selectedPackages.get(packageId) || 0));
  };

  // Handle continue
  const handleContinue = () => {
    if (selectedPackages.size === 0) {
      setValidationError('Please select at least one package');
      return;
    }

    const selectedArray: SelectedPackage[] = [];
    selectedPackages.forEach((quantity, packageId) => {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg && quantity > 0) {
        selectedArray.push({
          packageId,
          quantity,
          price: pricing.get(packageId) || pkg.defaultPrice,
          name: pkg.name
        });
      }
    });

    onNext(selectedArray);
  };

  // Get package price
  const getPackagePrice = (pkg: Package) => {
    return pricing.get(pkg.id) || pkg.defaultPrice;
  };

  // Check if package is available
  const isPackageAvailable = (packageId: number) => {
    const pkgAvailability = availability.get(packageId);
    return !pkgAvailability || pkgAvailability.availableQuantity > 0;
  };

  // Get spots available text
  const getSpotsAvailableText = (packageId: number) => {
    const pkgAvailability = availability.get(packageId);
    if (!pkgAvailability) return null;
    
    if (pkgAvailability.availableQuantity === 0) {
      return 'Sold out';
    }
    
    return `${pkgAvailability.availableQuantity} spots available`;
  };

  // Check if should show limited availability
  const isLimitedAvailability = (packageId: number) => {
    const pkgAvailability = availability.get(packageId);
    if (!pkgAvailability) return false;
    
    const percentAvailable = pkgAvailability.availableQuantity / pkgAvailability.totalSpots;
    return percentAvailable < 0.2 && pkgAvailability.availableQuantity > 0;
  };

  if (!selectedDate) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-red-600">Invalid configuration</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Loading packages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error}
        onRetry={fetchData}
      />
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center p-8">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No packages available for this date.</p>
      </div>
    );
  }

  return (
    <div className={`package-selection ${className}`} role="region" aria-label="Package selection">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-2">Select Your Package</h2>
        <p className="text-gray-600 mb-6">Choose the perfect package for your group</p>
        
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {validationError}
          </div>
        )}
        
        <div className="space-y-4 mb-6">
          {packages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">No packages available for this date.</p>
              <p className="text-gray-400 text-sm mt-2">Please contact us for availability.</p>
            </div>
          ) : (
            packages.map(pkg => {
            const price = getPackagePrice(pkg);
            const quantity = selectedPackages.get(pkg.id) || 0;
            const available = isPackageAvailable(pkg.id);
            const spotsText = getSpotsAvailableText(pkg.id);
            const isLimited = isLimitedAvailability(pkg.id);
            
            return (
              <article 
                key={pkg.id}
                className={`border rounded-lg p-4 ${
                  !available ? 'bg-gray-50 opacity-60' : 'hover:shadow-md transition-shadow'
                }`}
                role="article"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{pkg.name}</h3>
                    <p className="text-gray-600 text-sm">{pkg.description}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pkg.inclusions && pkg.inclusions.slice(0, 3).map((inclusion, idx) => (
                        <span 
                          key={idx}
                          className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded"
                        >
                          {inclusion}
                        </span>
                      ))}
                      {pkg.inclusions && pkg.inclusions.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{pkg.inclusions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-green-600">
                      {price !== undefined ? `£${price.toFixed(2)}` : 'Price TBD'}
                    </p>
                    <p className="text-sm text-gray-500">per person</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQuantityChange(pkg.id, -1)}
                      disabled={!available || quantity === 0}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      aria-label={`Decrease quantity for ${pkg.name}`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityInput(pkg.id, e.target.value)}
                      disabled={!available}
                      min="0"
                      max={availability.get(pkg.id)?.availableQuantity || 999}
                      className="w-16 text-center border rounded px-2 py-1 disabled:opacity-50"
                      aria-label={`Quantity for ${pkg.name}`}
                      role="spinbutton"
                    />
                    
                    <button
                      onClick={() => handleQuantityChange(pkg.id, 1)}
                      disabled={!available}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      aria-label={`Increase quantity for ${pkg.name}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {spotsText && (
                      <span 
                        className={`text-sm ${
                          !available ? 'text-red-600 font-semibold' :
                          isLimited ? 'text-orange-600' : 
                          'text-gray-600'
                        }`}
                        aria-live="polite"
                      >
                        {isLimited && <span className="font-semibold">Limited availability: </span>}
                        {spotsText}
                      </span>
                    )}
                    
                    <button
                      onClick={() => setSelectedModal(pkg.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      aria-label={`View details for ${pkg.name}`}
                    >
                      <Info className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              </article>
            );
          }))}
        </div>
        
        <div className="border-t pt-4 mb-6">
          <div className="flex justify-end items-center mb-2">
            <span className="text-xl font-semibold">
              Total: £{calculateTotal() !== undefined ? calculateTotal().toFixed(2) : '0.00'}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </button>
          
          <button
            onClick={handleContinue}
            disabled={selectedPackages.size === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
      
      {/* Package details modals */}
      {packages.map(pkg => (
        <PackageModal
          key={pkg.id}
          package={pkg}
          price={getPackagePrice(pkg)}
          isOpen={selectedModal === pkg.id}
          onClose={() => setSelectedModal(null)}
        />
      ))}
    </div>
  );
};

export default PackageSelection;