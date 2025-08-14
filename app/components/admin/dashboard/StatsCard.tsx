'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StatsCardProps } from '@/app/types/admin';

export default function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  loading = false,
  error,
  className = '',
}: StatsCardProps) {
  if (loading) {
    return (
      <div
        className={`bg-white rounded-lg shadow p-6 ${className}`}
        data-testid="stats-card-skeleton"
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {Icon && <div className="h-5 w-5 bg-gray-200 rounded"></div>}
          </div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {Icon && <Icon className="h-5 w-5 text-gray-400" data-testid="stats-card-icon" />}
        </div>
        <div className="text-red-600">
          <p className="text-2xl font-bold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {Icon && <Icon className="h-5 w-5 text-gray-400" data-testid="stats-card-icon" />}
      </div>
      
      <p className="text-3xl font-bold text-gray-900 mb-2">
        {typeof value === 'number' ? value.toString() : value}
      </p>
      
      {change && (
        <div className="flex items-center">
          {change.value === 0 ? (
            <div className="h-4 w-4 mr-1" />
          ) : change.type === 'increase' ? (
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
          )}
          <span
            className={`text-sm font-medium ${
              change.value === 0 ? 'text-gray-600' : 
              change.type === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change.value === 0 ? '0' : (change.type === 'increase' ? '+' : '-') + Math.abs(change.value)}% {change.period}
          </span>
        </div>
      )}
    </div>
  );
}