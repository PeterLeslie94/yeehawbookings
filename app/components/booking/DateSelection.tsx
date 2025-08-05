'use client';

import React, { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { DateSelectionProps, AvailableDate, CalendarDate } from '@/app/types/booking';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import ErrorMessage from '@/app/components/ui/ErrorMessage';

const DateSelection: React.FC<DateSelectionProps> = ({ 
  onDateSelect, 
  initialDate,
  className = '' 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<Map<string, AvailableDate>>(new Map());
  const [blackoutDates, setBlackoutDates] = useState<Map<string, string>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timezone, setTimezone] = useState<string>('Europe/London');

  // Fetch available dates and blackout dates
  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch blackout dates first
      const blackoutResponse = await fetch('/api/bookings/blackout-dates');
      if (!blackoutResponse.ok) {
        throw new Error('Failed to fetch blackout dates');
      }
      const blackoutData = await blackoutResponse.json();
      
      const blackoutMap = new Map<string, string>();
      blackoutData.blackoutDates.forEach((bd: any) => {
        const dateStr = format(new Date(bd.date), 'yyyy-MM-dd');
        blackoutMap.set(dateStr, bd.reason || 'Unavailable');
      });
      setBlackoutDates(blackoutMap);

      // Fetch available dates
      const availableResponse = await fetch('/api/bookings/available-dates?includeBlackouts=true');
      if (!availableResponse.ok) {
        throw new Error('Failed to fetch available dates');
      }
      const availableData = await availableResponse.json();
      
      const dateMap = new Map<string, AvailableDate>();
      availableData.availableDates.forEach((date: AvailableDate) => {
        dateMap.set(date.date, date);
      });
      
      setAvailableDates(dateMap);
      if (availableData.timezone) {
        setTimezone(availableData.timezone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading dates');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: string) => {
    const availableDate = availableDates.get(date);
    if (!availableDate || availableDate.isBlackedOut || availableDate.isPastCutoff) {
      return;
    }

    setSelectedDate(date);
    onDateSelect({
      date,
      dayOfWeek: availableDate.dayOfWeek,
      formattedDate: availableDate.formattedDate,
    });
  };

  const generateCalendarDates = (): CalendarDate[] => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const dates: CalendarDate[] = [];

    // Add empty cells for days before the first day of month
    const startDay = getDay(start);
    for (let i = 0; i < startDay; i++) {
      dates.push({
        date: new Date(0), // Placeholder date
        isAvailable: false,
        isBlackedOut: false,
        isPastCutoff: false,
        isSelected: false,
        cutoffTime: '',
      });
    }

    // Add all days of the month
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const availableDate = availableDates.get(dateStr);
      const isFridayOrSaturday = currentDate.getDay() === 5 || currentDate.getDay() === 6;

      dates.push({
        date: new Date(currentDate),
        isAvailable: isFridayOrSaturday && !!availableDate && !availableDate.isBlackedOut && !availableDate.isPastCutoff,
        isBlackedOut: !!availableDate?.isBlackedOut,
        isPastCutoff: !!availableDate?.isPastCutoff,
        isSelected: dateStr === selectedDate,
        blackoutReason: availableDate?.blackoutReason,
        cutoffTime: availableDate?.cutoffTime || '23:00',
      });

      currentDate = addDays(currentDate, 1);
    }

    return dates;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = direction === 'prev' 
        ? new Date(prev.getFullYear(), prev.getMonth() - 1)
        : new Date(prev.getFullYear(), prev.getMonth() + 1);
      return newMonth;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Loading available dates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={`Error loading dates: ${error}`}
        onRetry={fetchDates}
      />
    );
  }

  const calendarDates = generateCalendarDates();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`date-selection ${className}`} role="region" aria-label="Date selection calendar">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Timezone indicator */}
        <div className="text-sm text-gray-600 mb-4 flex items-center gap-2" data-testid="timezone-indicator">
          <Clock className="w-4 h-4" />
          All times shown in {timezone && timezone.includes('London') ? (new Date().getTimezoneOffset() === 0 ? 'GMT' : 'BST') : (timezone || 'Europe/London')}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day labels */}
          {dayLabels.map((day, index) => (
            <div 
              key={day} 
              className="text-center text-sm font-medium text-gray-600 p-2"
              data-testid={`day-label-${index}`}
            >
              {day}
            </div>
          ))}

          {/* Calendar dates */}
          {calendarDates.map((calendarDate, index) => {
            if (calendarDate.date.getTime() === 0) {
              // Empty cell
              return <div key={`empty-${index}`} className="p-2" />;
            }

            const dateStr = format(calendarDate.date, 'yyyy-MM-dd');
            const dayNumber = format(calendarDate.date, 'd');
            const availableDate = availableDates.get(dateStr);
            const isFridayOrSaturday = calendarDate.date.getDay() === 5 || calendarDate.date.getDay() === 6;

            let buttonClasses = 'w-full p-2 rounded-lg text-center transition-all ';
            let ariaLabel = `${format(calendarDate.date, 'EEEE, MMMM d')}`;

            if (!isFridayOrSaturday) {
              // Not a weekend day
              buttonClasses += 'text-gray-300 cursor-not-allowed';
            } else if (calendarDate.isBlackedOut) {
              buttonClasses += 'bg-red-100 text-red-400 cursor-not-allowed blackout-date';
              ariaLabel += ' - Blackout date';
            } else if (calendarDate.isPastCutoff) {
              buttonClasses += 'bg-gray-100 text-gray-400 cursor-not-allowed past-cutoff';
              ariaLabel += ' - Past booking cutoff time';
            } else if (calendarDate.isSelected) {
              buttonClasses += 'bg-blue-600 text-white selected-date available-date';
              ariaLabel += ' - Selected';
            } else if (calendarDate.isAvailable) {
              buttonClasses += 'bg-green-50 text-green-700 hover:bg-green-100 available-date';
              ariaLabel += ' - Available for booking';
            } else {
              buttonClasses += 'text-gray-400 cursor-not-allowed';
            }

            return (
              <div key={dateStr} className="relative group">
                <button
                  data-testid={`date-${dateStr}`}
                  onClick={() => handleDateClick(dateStr)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && calendarDate.isAvailable) {
                      handleDateClick(dateStr);
                    }
                  }}
                  disabled={!calendarDate.isAvailable}
                  className={buttonClasses}
                  aria-label={ariaLabel}
                  aria-pressed={calendarDate.isSelected}
                >
                  {dayNumber}
                </button>

                {/* Tooltip for blackout dates */}
                {calendarDate.isBlackedOut && calendarDate.blackoutReason && (
                  <div 
                    className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                    onMouseEnter={(e) => e.currentTarget.classList.add('opacity-100')}
                  >
                    {calendarDate.blackoutReason}
                  </div>
                )}

                {/* Cutoff time display */}
                {isFridayOrSaturday && availableDate && !calendarDate.isBlackedOut && (
                  <div 
                    className="text-xs text-gray-500 mt-1"
                    data-testid={`cutoff-${dateStr}`}
                  >
                    Book by {availableDate.cutoffTimeUK}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 rounded border border-green-200" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 rounded border border-red-200" />
            <span>Blackout Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 rounded border border-gray-200" />
            <span>Past Cutoff</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateSelection;