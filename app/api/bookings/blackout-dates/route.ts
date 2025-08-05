import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { formatDateForDisplay, getDayOfWeekName } from '@/app/lib/booking/dates';
import { BlackoutDatesResponse, BlackoutDate } from '@/app/types/booking';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const includePast = searchParams.get('includePast') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: any = {};

    // Parse and validate dates
    if (startDateParam) {
      const startDate = parseISO(startDateParam);
      if (!isValid(startDate)) {
        return NextResponse.json(
          { error: 'Invalid date format for startDate' },
          { status: 400 }
        );
      }
      where.date = { ...where.date, gte: startDate };
    } else if (!includePast) {
      // Default to excluding past dates
      where.date = { ...where.date, gte: startOfDay(new Date()) };
    }

    if (endDateParam) {
      const endDate = parseISO(endDateParam);
      if (!isValid(endDate)) {
        return NextResponse.json(
          { error: 'Invalid date format for endDate' },
          { status: 400 }
        );
      }
      
      // Validate end date is after start date
      if (startDateParam) {
        const startDate = parseISO(startDateParam);
        if (endDate < startDate) {
          return NextResponse.json(
            { error: 'End date must be after start date' },
            { status: 400 }
          );
        }
      }
      
      where.date = { ...where.date, lte: endDate };
    }

    // Get total count for pagination
    const total = await prisma.blackoutDate.count({ where });

    // Fetch blackout dates
    const blackoutDates = await prisma.blackoutDate.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
      skip: offset,
      take: limit,
    });

    // Format blackout dates
    const formattedBlackoutDates: BlackoutDate[] = blackoutDates.map(bd => ({
      id: bd.id,
      date: bd.date.toISOString(),
      reason: bd.reason,
      formattedDate: formatDateForDisplay(bd.date, true),
      dayOfWeek: getDayOfWeekName(bd.date),
    }));

    const hasMore = offset + blackoutDates.length < total;

    const response: BlackoutDatesResponse = {
      blackoutDates: formattedBlackoutDates,
      total,
      hasMore,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching blackout dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blackout dates' },
      { status: 500 }
    );
  }
}