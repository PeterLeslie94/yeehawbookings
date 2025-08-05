import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { format, addDays, parseISO, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  getNextFridaysAndSaturdays, 
  formatDateForDisplay, 
  formatTimeForDisplay,
  isPastCutoffTime,
  getDayOfWeekName
} from '@/app/lib/booking/dates';
import { AvailableDatesResponse, AvailableDate } from '@/app/types/booking';

const UK_TIMEZONE = 'Europe/London';
const DEFAULT_CUTOFF_TIME = '23:00';
const DEFAULT_DATE_RANGE_DAYS = 90; // 3 months

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const includeBlackouts = searchParams.get('includeBlackouts') === 'true';

    // Parse and validate dates
    const today = new Date();
    let startDate = startDateParam ? parseISO(startDateParam) : today;
    let endDate = endDateParam 
      ? parseISO(endDateParam) 
      : addDays(today, DEFAULT_DATE_RANGE_DAYS);

    // Validate dates
    if (startDateParam && !isValid(startDate)) {
      return NextResponse.json(
        { error: 'Invalid start date format' },
        { status: 400 }
      );
    }

    if (endDateParam && !isValid(endDate)) {
      return NextResponse.json(
        { error: 'Invalid end date format' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Get all Fridays and Saturdays in the date range
    const weekendDates = getNextFridaysAndSaturdays(startDate, endDate);

    // Fetch blackout dates from database
    const blackoutDates = await prisma.blackoutDate.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Fetch custom cutoff times (by day of week)
    const cutoffTimes = await prisma.dailyCutoffTime.findMany({
      where: {
        isActive: true,
      },
    });

    // Create a map of day of week to cutoff time
    const cutoffTimeMap = new Map<number, string>();
    cutoffTimes.forEach(ct => {
      cutoffTimeMap.set(ct.dayOfWeek, ct.cutoffTime);
    });

    // Create a map of blackout dates
    const blackoutMap = new Map<string, string>();
    blackoutDates.forEach(bd => {
      blackoutMap.set(format(bd.date, 'yyyy-MM-dd'), bd.reason || '');
    });

    // Build available dates array
    const availableDates: AvailableDate[] = weekendDates
      .map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        const cutoffTime = cutoffTimeMap.get(dayOfWeek) || DEFAULT_CUTOFF_TIME;
        const isBlackedOut = blackoutMap.has(dateStr);
        const isPastCutoff = isPastCutoffTime(date, cutoffTime);

        // Skip blackout dates unless includeBlackouts is true
        if (isBlackedOut && !includeBlackouts) {
          return null;
        }

        return {
          date: dateStr,
          dayOfWeek: getDayOfWeekName(date) as 'Friday' | 'Saturday',
          cutoffTime,
          cutoffTimeUK: formatTimeForDisplay(cutoffTime),
          isBlackedOut,
          isPastCutoff,
          blackoutReason: isBlackedOut ? blackoutMap.get(dateStr) : undefined,
          timezone: UK_TIMEZONE,
          formattedDate: formatDateForDisplay(date),
        };
      })
      .filter((date): date is AvailableDate => date !== null);

    // Get current UK time
    const currentTimeUK = formatInTimeZone(new Date(), UK_TIMEZONE, 'yyyy-MM-dd HH:mm:ss zzz');

    const response: AvailableDatesResponse = {
      availableDates,
      timezone: UK_TIMEZONE,
      currentTimeUK,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available dates' },
      { status: 500 }
    );
  }
}