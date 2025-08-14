import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');

    // Validate date parameter
    if (!dateStr) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Validate date format
    const date = new Date(dateStr);
    if (isNaN(date.getTime()) || dateStr !== date.toISOString().split('T')[0]) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Check if date is in the past first
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return NextResponse.json(
        { error: 'Cannot check availability for past dates' },
        { status: 400 }
      );
    }

    // Check if date is Friday or Saturday
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      return NextResponse.json(
        { error: 'Bookings are only available on Fridays and Saturdays' },
        { status: 400 }
      );
    }

    // Check for blackout date
    const blackoutDate = await prisma.blackoutDate.findUnique({
      where: { date }
    });

    if (blackoutDate) {
      return NextResponse.json({
        date: dateStr,
        isBlackoutDate: true,
        blackoutReason: blackoutDate.reason,
        availability: []
      });
    }

    // Get all active packages with their availability
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        availability: {
          where: { date }
        }
      }
    });

    // Format availability response
    const availability = packages.map(pkg => {
      const availabilityData = pkg.availability[0];
      
      return {
        packageId: pkg.id,
        packageName: pkg.name,
        maxGuests: pkg.maxGuests,
        isAvailable: availabilityData?.isAvailable ?? false,
        availableQuantity: availabilityData?.availableQuantity ?? 0,
        ...(!availabilityData ? { message: 'No availability data' } : {})
      };
    });

    return NextResponse.json({
      date: dateStr,
      isBlackoutDate: false,
      availability
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}