'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, Package, Clock } from 'lucide-react';
import StatsCard from '@/app/components/admin/dashboard/StatsCard';
import TodayBookings from '@/app/components/admin/dashboard/TodayBookings';
import RevenueChart from '@/app/components/admin/dashboard/RevenueChart';
import { 
  DashboardStats, 
  TodayBooking, 
  RevenueChartData, 
  AdminApiResponse 
} from '@/app/types/admin';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueChartData | null>(null);
  const [loading, setLoading] = useState({
    stats: true,
    bookings: true,
    revenue: true,
  });
  const [errors, setErrors] = useState({
    stats: '',
    bookings: '',
    revenue: '',
  });

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      const response = await fetch('/api/admin/dashboard/stats');
      const result: AdminApiResponse<DashboardStats> = await response.json();
      
      if (response.ok && result.success) {
        setStats(result.data!);
        setErrors(prev => ({ ...prev, stats: '' }));
      } else {
        throw new Error(result.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setErrors(prev => ({ 
        ...prev, 
        stats: error instanceof Error ? error.message : 'Failed to fetch stats' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // Fetch today's bookings
  const fetchTodayBookings = async () => {
    try {
      setLoading(prev => ({ ...prev, bookings: true }));
      const response = await fetch('/api/admin/dashboard/today-bookings');
      const result: AdminApiResponse<TodayBooking[]> = await response.json();
      
      if (response.ok && result.success) {
        setTodayBookings(result.data || []);
        setErrors(prev => ({ ...prev, bookings: '' }));
      } else {
        throw new Error(result.error || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching today\'s bookings:', error);
      setErrors(prev => ({ 
        ...prev, 
        bookings: error instanceof Error ? error.message : 'Failed to fetch bookings' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, bookings: false }));
    }
  };

  // Fetch revenue chart data
  const fetchRevenueData = async (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    try {
      setLoading(prev => ({ ...prev, revenue: true }));
      const response = await fetch(`/api/admin/dashboard/revenue?period=${period}`);
      const result: AdminApiResponse<RevenueChartData> = await response.json();
      
      if (response.ok && result.success) {
        setRevenueData(result.data!);
        setErrors(prev => ({ ...prev, revenue: '' }));
      } else {
        throw new Error(result.error || 'Failed to fetch revenue data');
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setErrors(prev => ({ 
        ...prev, 
        revenue: error instanceof Error ? error.message : 'Failed to fetch revenue data' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, revenue: false }));
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchStats();
    fetchTodayBookings();
    fetchRevenueData();
  }, []);

  // Calculate percentage changes (mock data for now - would come from API in real implementation)
  const getStatsWithChanges = () => {
    if (!stats) return null;

    return {
      todayBookings: {
        value: stats.bookings.today,
        change: {
          value: 12.5,
          type: 'increase' as const,
          period: 'vs yesterday'
        }
      },
      thisWeekBookings: {
        value: stats.bookings.thisWeek,
        change: {
          value: 8.2,
          type: 'increase' as const,
          period: 'vs last week'
        }
      },
      thisMonthBookings: {
        value: stats.bookings.thisMonth,
        change: {
          value: 15.1,
          type: 'increase' as const,
          period: 'vs last month'
        }
      },
      todayRevenue: {
        value: `£${stats.revenue.today.toFixed(2)}`,
        change: {
          value: 22.3,
          type: 'increase' as const,
          period: 'vs yesterday'
        }
      },
      thisWeekRevenue: {
        value: `£${stats.revenue.thisWeek.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
        change: {
          value: 18.7,
          type: 'increase' as const,
          period: 'vs last week'
        }
      },
      pendingBookings: {
        value: stats.bookings.byStatus.PENDING,
        change: undefined // No change data for status counts
      }
    };
  };

  const statsWithChanges = getStatsWithChanges();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to your admin dashboard. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              fetchStats();
              fetchTodayBookings();
              fetchRevenueData();
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatsCard
          title="Today's Bookings"
          value={statsWithChanges?.todayBookings.value ?? 0}
          change={statsWithChanges?.todayBookings.change}
          icon={Calendar}
          loading={loading.stats}
          error={errors.stats}
        />
        <StatsCard
          title="This Week"
          value={statsWithChanges?.thisWeekBookings.value ?? 0}
          change={statsWithChanges?.thisWeekBookings.change}
          icon={TrendingUp}
          loading={loading.stats}
          error={errors.stats}
        />
        <StatsCard
          title="This Month"
          value={statsWithChanges?.thisMonthBookings.value ?? 0}
          change={statsWithChanges?.thisMonthBookings.change}
          icon={Package}
          loading={loading.stats}
          error={errors.stats}
        />
        <StatsCard
          title="Today's Revenue"
          value={statsWithChanges?.todayRevenue.value ?? '£0.00'}
          change={statsWithChanges?.todayRevenue.change}
          icon={DollarSign}
          loading={loading.stats}
          error={errors.stats}
        />
        <StatsCard
          title="Weekly Revenue"
          value={statsWithChanges?.thisWeekRevenue.value ?? '£0.00'}
          change={statsWithChanges?.thisWeekRevenue.change}
          icon={DollarSign}
          loading={loading.stats}
          error={errors.stats}
        />
        <StatsCard
          title="Pending Bookings"
          value={statsWithChanges?.pendingBookings.value ?? 0}
          change={statsWithChanges?.pendingBookings.change}
          icon={Users}
          loading={loading.stats}
          error={errors.stats}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2">
          {revenueData && (
            <RevenueChart
              data={revenueData}
              period="daily"
              loading={loading.revenue}
              error={errors.revenue}
              onPeriodChange={(period) => fetchRevenueData(period)}
            />
          )}
        </div>

        {/* Today's Bookings - Takes 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <TodayBookings
            bookings={todayBookings}
            loading={loading.bookings}
            error={errors.bookings}
            onRefresh={fetchTodayBookings}
          />
        </div>
      </div>

      {/* Popular Packages Section */}
      {stats && stats.packages && stats.packages.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Popular Packages</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.packages.slice(0, 3).map((pkg) => (
                <div key={pkg.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                    <span className="text-sm text-gray-500">{pkg.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bookings:</span>
                      <span className="font-medium">{pkg.bookingCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-medium">£{pkg.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}