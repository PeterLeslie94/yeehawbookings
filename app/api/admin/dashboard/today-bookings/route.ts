import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth/config';
import { prisma } from '@/app/lib/prisma';
import { startOfDay, endOfDay, format } from 'date-fns';
import { AdminApiResponse, TodayBooking } from '@/app/types/admin';

export async function GET(request: NextRequest): Promise<NextResponse<AdminApiResponse<TodayBooking[]>>> {
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

    // Get today's bookings
    const bookings = await prisma.booking.findMany({
      where: {
        bookingDate: {
          gte: todayStart,
          lt: endOfDay(now),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            package: {
              select: {
                name: true,
              },
            },
            extra: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform bookings to match TodayBooking interface
    const todayBookings: TodayBooking[] = bookings.map((booking) => {
      // Get customer name and email (priority: user data > guest data)
      const customerName = booking.user?.name || booking.guestName || 'Unknown';
      const customerEmail = booking.user?.email || booking.guestEmail || 'Unknown';

      // Format booking time (created at time)
      const bookingTime = format(booking.createdAt, 'HH:mm');

      // Combine packages and extras into a single packages array for display
      const packages: Array<{ name: string; quantity: number }> = [];

      booking.items.forEach((item) => {
        if (item.package) {
          packages.push({
            name: item.package.name,
            quantity: item.quantity,
          });
        } else if (item.extra) {
          packages.push({
            name: item.extra.name,
            quantity: item.quantity,
          });
        }
      });

      return {
        id: booking.id,
        bookingReference: booking.bookingReference,
        customerName,
        customerEmail,
        status: booking.status,
        finalAmount: booking.finalAmount,
        bookingTime,
        packages,
      };
    });

    return NextResponse.json({
      success: true,
      data: todayBookings,
    });
  } catch (error) {
    console.error('Today\'s bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today\'s bookings' },
      { status: 500 }
    );
  }
}