import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const date = new Date(dateParam);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const extras = await prisma.extra.findMany({
      where: { isActive: true },
      include: {
        availability: {
          where: {
            date: date,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform the data to include availability info for each extra
    const extrasWithAvailability = extras.map(extra => {
      const availability = extra.availability[0] || {
        availableQuantity: 0,
        isAvailable: false,
        totalQuantity: 0,
      };

      return {
        ...extra,
        availability: {
          availableQuantity: availability.availableQuantity,
          isAvailable: availability.isAvailable,
          totalQuantity: availability.totalQuantity,
        },
      };
    });

    return NextResponse.json({
      extras: extrasWithAvailability,
      date: dateParam,
      timezone: 'Europe/London',
    });
  } catch (error) {
    console.error('Error fetching extras availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extras availability' },
      { status: 500 }
    );
  }
}