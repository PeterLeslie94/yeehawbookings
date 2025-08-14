import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth/config';
import { prisma } from '@/app/lib/prisma';
import { BookingStatus } from '@prisma/client';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from 'date-fns';
import { AdminApiResponse, RevenueChartData, ChartDataPoint } from '@/app/types/admin';

type Period = 'daily' | 'weekly' | 'monthly';

export async function GET(request: NextRequest): Promise<NextResponse<AdminApiResponse<RevenueChartData>>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'daily') as Period;

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Invalid period. Must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let groupByFormat: string;

    // Set date range based on period
    switch (period) {
      case 'daily':
        startDate = subDays(now, 29); // Last 30 days
        endDate = now;
        groupByFormat = 'd MMM';
        break;
      case 'weekly':
        startDate = subWeeks(now, 11); // Last 12 weeks
        endDate = now;
        groupByFormat = "'Week' w MMM";
        break;
      case 'monthly':
        startDate = subMonths(now, 11); // Last 12 months
        endDate = now;
        groupByFormat = 'MMMM yyyy';
        break;
      default:
        startDate = subDays(now, 29);
        endDate = now;
        groupByFormat = 'd MMM';
    }

    // Fetch revenue data
    const revenueData = await prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        bookingDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        bookingDate: true,
        finalAmount: true,
      },
    });

    // Group and format data based on period
    const groupedData = new Map<string, number>();

    revenueData.forEach((booking) => {
      let groupKey: string;
      let label: string;

      switch (period) {
        case 'daily':
          groupKey = format(booking.bookingDate, 'yyyy-MM-dd');
          label = format(booking.bookingDate, groupByFormat);
          break;
        case 'weekly':
          const weekStart = startOfWeek(booking.bookingDate);
          groupKey = format(weekStart, 'yyyy-MM-dd');
          label = format(weekStart, groupByFormat);
          break;
        case 'monthly':
          const monthStart = startOfMonth(booking.bookingDate);
          groupKey = format(monthStart, 'yyyy-MM-dd');
          label = format(monthStart, groupByFormat);
          break;
        default:
          groupKey = format(booking.bookingDate, 'yyyy-MM-dd');
          label = format(booking.bookingDate, groupByFormat);
      }

      const currentAmount = groupedData.get(groupKey) || 0;
      groupedData.set(groupKey, currentAmount + booking.finalAmount);
    });

    // Convert to chart data format
    const chartData: ChartDataPoint[] = Array.from(groupedData.entries())
      .map(([date, value]) => ({
        label: format(new Date(date), groupByFormat),
        value: Math.round(value * 100) / 100, // Round to 2 decimal places
        date,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build response data structure
    const responseData: RevenueChartData = {
      daily: period === 'daily' ? chartData : [],
      weekly: period === 'weekly' ? chartData : [],
      monthly: period === 'monthly' ? chartData : [],
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Revenue data error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}