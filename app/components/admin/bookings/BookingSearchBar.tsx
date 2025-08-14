'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, X, Calendar, Clock, Users } from 'lucide-react';
import { BookingStatus } from '@prisma/client';
import { format, startOfToday, startOfWeek, startOfMonth, endOfToday, endOfWeek, endOfMonth } from 'date-fns';

interface Filters {
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
}

interface BookingSearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Filters) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  onExport: () => void;
  loading?: boolean;
  totalCount: number;
  initialFilters?: Filters;
}

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function BookingSearchBar({
  onSearch,
  onFilterChange,
  onSortChange,
  onExport,
  loading = false,
  totalCount,
  initialFilters = {},
}: BookingSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<Record<string, Filters>>({});

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('booking-search');
        searchInput?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value === '') {
      onSearch('');
    }
  }, [onSearch]);

  const handleFilterChange = useCallback((newFilters: Partial<Filters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }, [filters, onFilterChange]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({});
    onSearch('');
    onFilterChange({});
  }, [onSearch, onFilterChange]);

  const applyQuickFilter = useCallback((type: 'today' | 'week' | 'month') => {
    const today = new Date();
    let startDate: string;
    let endDate: string;

    switch (type) {
      case 'today':
        startDate = format(startOfToday(), 'yyyy-MM-dd');
        endDate = format(endOfToday(), 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(startOfWeek(today), 'yyyy-MM-dd');
        endDate = format(endOfWeek(today), 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
    }

    handleFilterChange({ startDate, endDate });
  }, [handleFilterChange]);

  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;
    
    const newPresets = {
      ...savedPresets,
      [presetName]: { ...filters }
    };
    
    setSavedPresets(newPresets);
    setPresetName('');
    setIsPresetModalOpen(false);
    
    // In a real app, you'd save this to localStorage or backend
    localStorage.setItem('booking-filter-presets', JSON.stringify(newPresets));
  }, [presetName, filters, savedPresets]);

  const loadPreset = useCallback((preset: Filters) => {
    setFilters(preset);
    onFilterChange(preset);
  }, [onFilterChange]);

  const removeFilter = useCallback((key: keyof Filters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof Filters]);

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return '';
    if (startDate && !endDate) return format(new Date(startDate), 'MMM d, yyyy') + ' onwards';
    if (!startDate && endDate) return 'Until ' + format(new Date(endDate), 'MMM d, yyyy');
    if (startDate === endDate) return format(new Date(startDate), 'MMM d, yyyy');
    return `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate!), 'MMM d, yyyy')}`;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
      <div className="flex flex-col space-y-4">
        {/* Search and basic controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                id="booking-search"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by reference, name, or email..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                aria-busy={loading}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {totalCount} booking{totalCount !== 1 ? 's' : ''} found
            </span>
            
            <button
              onClick={onExport}
              disabled={totalCount === 0}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange({ status: e.target.value as BookingStatus || undefined })}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Status filter"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Date range start"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Date range end"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <select
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                onSortChange(field, order as 'asc' | 'desc');
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Sort by"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="bookingDate-asc">Booking Date (Upcoming)</option>
              <option value="bookingDate-desc">Booking Date (Recent)</option>
              <option value="finalAmount-desc">Amount (High to Low)</option>
              <option value="finalAmount-asc">Amount (Low to High)</option>
            </select>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Quick filters:</span>
          <button
            onClick={() => applyQuickFilter('today')}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Today
          </button>
          <button
            onClick={() => applyQuickFilter('week')}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            This Week
          </button>
          <button
            onClick={() => applyQuickFilter('month')}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            This Month
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Clear Filters
            </button>
          )}

          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Save Preset
          </button>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            
            {filters.status && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                Status: {filters.status.charAt(0) + filters.status.slice(1).toLowerCase()}
                <button
                  onClick={() => removeFilter('status')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  data-testid="remove-filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {(filters.startDate || filters.endDate) && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                {formatDateRange(filters.startDate, filters.endDate)}
                <button
                  onClick={() => {
                    removeFilter('startDate');
                    removeFilter('endDate');
                  }}
                  className="ml-1 text-green-600 hover:text-green-800"
                  data-testid="remove-filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Date Range Validation Error */}
        {filters.startDate && filters.endDate && new Date(filters.startDate) > new Date(filters.endDate) && (
          <div className="text-sm text-red-600">
            End date must be after start date
          </div>
        )}

        {/* Saved Presets */}
        {Object.keys(savedPresets).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Saved presets:</span>
            {Object.entries(savedPresets).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => loadPreset(preset)}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Save Preset Modal */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Save Filter Preset</h3>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Enter preset name..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && savePreset()}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}