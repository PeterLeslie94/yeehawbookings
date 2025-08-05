import { format, addDays, setHours, setMinutes, isAfter, isBefore, isEqual, startOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const UK_TIMEZONE = 'Europe/London';

export function getNextFridaysAndSaturdays(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = startOfDay(startDate);
  const end = startOfDay(endDate);

  while (!isAfter(currentDate, end)) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
      dates.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

export function isDateAvailable(
  date: Date, 
  blackoutDates: Date[], 
  cutoffTime: string
): boolean {
  // Check if date is blacked out
  const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
  const isBlackedOut = blackoutDates.some(
    blackout => format(startOfDay(blackout), 'yyyy-MM-dd') === dateStr
  );
  
  if (isBlackedOut) {
    return false;
  }

  // Check if past cutoff time
  return !isPastCutoffTime(date, cutoffTime);
}

export function isPastCutoffTime(date: Date, cutoffTime: string): boolean {
  const now = new Date();
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  
  // Create cutoff datetime for the given date
  const cutoffDateTime = setMinutes(setHours(date, hours), minutes);
  
  // If the date is today, check if current time is past cutoff
  if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
    return isAfter(now, cutoffDateTime);
  }
  
  // If the date is in the past, it's past cutoff
  if (isBefore(startOfDay(date), startOfDay(now))) {
    return true;
  }
  
  // Future dates are not past cutoff
  return false;
}

export function formatDateForDisplay(date: Date, includeYear = false): string {
  const dayOfWeek = getDayOfWeekName(date);
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  const month = format(date, 'MMMM');
  const year = includeYear ? ` ${format(date, 'yyyy')}` : '';
  
  return `${dayOfWeek}, ${day}${ordinal} ${month}${year}`;
}

export function formatTimeForDisplay(time: string): string {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return time; // Return original if invalid
    }
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time; // Return original if parsing fails
  }
}

export function convertToUKTimezone(date: Date): Date {
  return toZonedTime(date, UK_TIMEZONE);
}

export function getDayOfWeekName(date: Date): string {
  return format(date, 'EEEE');
}

export function isWeekendDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
}

export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  while (!isAfter(currentDate, endDate)) {
    dates.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

export function filterBlackoutDates(dates: Date[], blackoutDates: Date[]): Date[] {
  const blackoutDateStrings = new Set(
    blackoutDates.map(date => format(date, 'yyyy-MM-dd'))
  );

  return dates.filter(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !blackoutDateStrings.has(dateStr);
  });
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}