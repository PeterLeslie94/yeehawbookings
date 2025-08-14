import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth/config';
import { prisma } from '@/app/lib/prisma';
import { BookingStatus } from '@prisma/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { AdminApiResponse, DashboardStats, BookingStats, RevenueStats, PackageStats } from '@/app/types/admin';

export async function GET(request: NextRequest): Promise<NextResponse<AdminApiResponse<DashboardStats>>> {
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

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get booking counts
    const [
      todayCount,
      weekCount,
      monthCount,
      pendingCount,
      confirmedCount,
      cancelledCount,
      refundedCount,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          bookingDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.booking.count({
        where: {
          bookingDate: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.booking.count({
        where: {
          bookingDate: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.PENDING },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.CONFIRMED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.CANCELLED },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.REFUNDED },
      }),
    ]);

    // Get revenue data
    const [todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
      prisma.booking.aggregate({
        where: {
          bookingDate: { gte: todayStart, lte: todayEnd },
          status: BookingStatus.CONFIRMED,
        },
        _sum: { finalAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          bookingDate: { gte: weekStart, lte: weekEnd },
          status: BookingStatus.CONFIRMED,
        },
        _sum: { finalAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          bookingDate: { gte: monthStart, lte: monthEnd },
          status: BookingStatus.CONFIRMED,
        },
        _sum: { finalAmount: true },
      }),
    ]);

    // Get package statistics
    const packageStats = await prisma.bookingItem.groupBy({
      by: ['packageId'],
      where: {
        packageId: { not: null },
        booking: {
          status: BookingStatus.CONFIRMED,
        },
      },
      _count: { packageId: true },
      _sum: { totalPrice: true },
    });

    // Get package details
    const packages = await prisma.package.findMany({
      where: {
        id: {
          in: packageStats.map((stat) => stat.packageId!),
        },
      },
    });

    // Calculate total revenue for percentage calculation
    const totalPackageRevenue = packageStats.reduce(
      (sum, stat) => sum + (stat._sum.totalPrice || 0),
      0
    );

    // Build package stats array
    const packageStatsArray: PackageStats[] = packageStats
      .map((stat) => {
        const packageDetails = packages.find((p) => p.id === stat.packageId);
        if (!packageDetails) return null;

        const revenue = stat._sum.totalPrice || 0;
        const percentage = totalPackageRevenue > 0 ? (revenue / totalPackageRevenue) * 100 : 0;

        return {
          id: stat.packageId!,
          name: packageDetails.name,
          bookingCount: stat._count.packageId,
          revenue,
          percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        };
      })
      .filter((stat): stat is PackageStats => stat !== null)
      .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

    const bookingStats: BookingStats = {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      byStatus: {
        [BookingStatus.PENDING]: pendingCount,
        [BookingStatus.CONFIRMED]: confirmedCount,
        [BookingStatus.CANCELLED]: cancelledCount,
        [BookingStatus.REFUNDED]: refundedCount,
      },
    };

    const revenueStats: RevenueStats = {
      today: todayRevenue._sum.finalAmount || 0,
      thisWeek: weekRevenue._sum.finalAmount || 0,
      thisMonth: monthRevenue._sum.finalAmount || 0,
      currency: 'gbp',
    };

    const dashboardStats: DashboardStats = {
      bookings: bookingStats,
      revenue: revenueStats,
      packages: packageStatsArray,
      todayBookings: [], // This will be fetched separately
    };

    return NextResponse.json({
      success: true,
      data: dashboardStats,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}