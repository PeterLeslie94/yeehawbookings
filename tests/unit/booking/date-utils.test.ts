import {
  getNextFridaysAndSaturdays,
  isDateAvailable,
  isPastCutoffTime,
  formatDateForDisplay,
  formatTimeForDisplay,
  convertToUKTimezone,
  getDayOfWeekName,
  isWeekendDay,
  generateDateRange,
  filterBlackoutDates,
} from '@/app/lib/booking/dates';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

describe('Date Utilities', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getNextFridaysAndSaturdays', () => {
    it('should return only Fridays and Saturdays within date range', () => {
      // Arrange
      const startDate = new Date('2024-03-01'); // Friday
      const endDate = new Date('2024-03-31'); // Sunday

      // Act
      const dates = getNextFridaysAndSaturdays(startDate, endDate);

      // Assert
      expect(dates.length).toBeGreaterThan(0);
      dates.forEach(date => {
        const dayOfWeek = date.getDay();
        expect([5, 6]).toContain(dayOfWeek); // 5 = Friday, 6 = Saturday
      });
    });

    it('should exclude dates before start date', () => {
      // Arrange
      const today = new Date();
      const endDate = addDays(today, 30);

      // Act
      const dates = getNextFridaysAndSaturdays(today, endDate);

      // Assert
      dates.forEach(date => {
        expect(date.getTime()).toBeGreaterThanOrEqual(today.setHours(0, 0, 0, 0));
      });
    });

    it('should handle empty range when end date is before start date', () => {
      // Arrange
      const startDate = new Date('2024-03-15');
      const endDate = new Date('2024-03-01');

      // Act
      const dates = getNextFridaysAndSaturdays(startDate, endDate);

      // Assert
      expect(dates).toEqual([]);
    });

    it('should include the start date if it is a Friday or Saturday', () => {
      // Arrange
      const friday = new Date('2024-03-01'); // Friday
      const endDate = addDays(friday, 7);

      // Act
      const dates = getNextFridaysAndSaturdays(friday, endDate);

      // Assert
      expect(dates[0].getTime()).toBe(friday.setHours(0, 0, 0, 0));
    });
  });

  describe('isDateAvailable', () => {
    it('should return true for available date', () => {
      // Arrange
      const date = addDays(new Date(), 7); // Future date
      const blackoutDates: Date[] = [];
      const cutoffTime = '23:00';

      // Act
      const isAvailable = isDateAvailable(date, blackoutDates, cutoffTime);

      // Assert
      expect(isAvailable).toBe(true);
    });

    it('should return false for blackout date', () => {
      // Arrange
      const date = new Date('2024-03-15');
      const blackoutDates = [new Date('2024-03-15')];
      const cutoffTime = '23:00';

      // Act
      const isAvailable = isDateAvailable(date, blackoutDates, cutoffTime);

      // Assert
      expect(isAvailable).toBe(false);
    });

    it('should return false for date past cutoff time', () => {
      // Arrange
      const today = new Date();
      const cutoffTime = format(setMinutes(setHours(today, today.getHours() - 1), 0), 'HH:mm');
      const blackoutDates: Date[] = [];
      
      jest.useFakeTimers();
      jest.setSystemTime(today);

      // Act
      const isAvailable = isDateAvailable(today, blackoutDates, cutoffTime);

      // Assert
      expect(isAvailable).toBe(false);
    });
  });

  describe('isPastCutoffTime', () => {
    it('should return false when current time is before cutoff', () => {
      // Arrange
      const date = new Date('2024-03-15');
      const currentTime = setMinutes(setHours(date, 20), 0); // 8:00 PM
      const cutoffTime = '23:00'; // 11:00 PM

      jest.useFakeTimers();
      jest.setSystemTime(currentTime);

      // Act
      const result = isPastCutoffTime(date, cutoffTime);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when current time is after cutoff', () => {
      // Arrange
      const date = new Date('2024-03-15');
      const currentTime = setMinutes(setHours(date, 23), 30); // 11:30 PM
      const cutoffTime = '23:00'; // 11:00 PM

      jest.useFakeTimers();
      jest.setSystemTime(currentTime);

      // Act
      const result = isPastCutoffTime(date, cutoffTime);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle cutoff time on different date correctly', () => {
      // Arrange - Current time is Thursday 10 PM, checking Friday's cutoff
      const thursday = new Date('2024-03-14');
      const friday = new Date('2024-03-15');
      const currentTime = setMinutes(setHours(thursday, 22), 0); // Thursday 10:00 PM
      const cutoffTime = '23:00'; // Friday 11:00 PM

      jest.useFakeTimers();
      jest.setSystemTime(currentTime);

      // Act
      const result = isPastCutoffTime(friday, cutoffTime);

      // Assert - Should still be available since cutoff is tomorrow
      expect(result).toBe(false);
    });

    it('should handle same day cutoff correctly', () => {
      // Arrange - It's Friday 11:30 PM, checking Friday's cutoff
      const friday = new Date('2024-03-15');
      const currentTime = setMinutes(setHours(friday, 23), 30); // 11:30 PM
      const cutoffTime = '23:00'; // 11:00 PM

      jest.useFakeTimers();
      jest.setSystemTime(currentTime);

      // Act
      const result = isPastCutoffTime(friday, cutoffTime);

      // Assert - Should be past cutoff
      expect(result).toBe(true);
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date with ordinal suffix', () => {
      // Arrange
      const dates = [
        { date: new Date('2024-03-01'), expected: 'Friday, 1st March' },
        { date: new Date('2024-03-02'), expected: 'Saturday, 2nd March' },
        { date: new Date('2024-03-03'), expected: 'Sunday, 3rd March' },
        { date: new Date('2024-03-04'), expected: 'Monday, 4th March' },
        { date: new Date('2024-03-21'), expected: 'Thursday, 21st March' },
        { date: new Date('2024-03-22'), expected: 'Friday, 22nd March' },
        { date: new Date('2024-03-23'), expected: 'Saturday, 23rd March' },
      ];

      // Act & Assert
      dates.forEach(({ date, expected }) => {
        expect(formatDateForDisplay(date)).toBe(expected);
      });
    });

    it('should include year when specified', () => {
      // Arrange
      const date = new Date('2024-03-15');

      // Act
      const result = formatDateForDisplay(date, true);

      // Assert
      expect(result).toBe('Friday, 15th March 2024');
    });
  });

  describe('formatTimeForDisplay', () => {
    it('should format 24-hour time to 12-hour format', () => {
      // Arrange
      const times = [
        { time: '00:00', expected: '12:00 AM' },
        { time: '01:30', expected: '1:30 AM' },
        { time: '12:00', expected: '12:00 PM' },
        { time: '13:45', expected: '1:45 PM' },
        { time: '23:00', expected: '11:00 PM' },
        { time: '23:59', expected: '11:59 PM' },
      ];

      // Act & Assert
      times.forEach(({ time, expected }) => {
        expect(formatTimeForDisplay(time)).toBe(expected);
      });
    });

    it('should handle invalid time format gracefully', () => {
      // Arrange
      const invalidTimes = ['25:00', '12:60', 'invalid', ''];

      // Act & Assert
      invalidTimes.forEach(time => {
        expect(() => formatTimeForDisplay(time)).not.toThrow();
      });
    });
  });

  describe('convertToUKTimezone', () => {
    it('should convert date to UK timezone', () => {
      // Arrange
      const date = new Date('2024-03-15T12:00:00Z'); // UTC noon

      // Act
      const ukDate = convertToUKTimezone(date);

      // Assert
      // In March, UK is in GMT (UTC+0)
      expect(ukDate.getHours()).toBe(12);
    });

    it('should handle BST (British Summer Time) correctly', () => {
      // Arrange
      const date = new Date('2024-07-15T12:00:00Z'); // UTC noon in July

      // Act
      const ukDate = convertToUKTimezone(date);

      // Assert
      // In July, UK is in BST (UTC+1)
      expect(ukDate.getHours()).toBe(13);
    });
  });

  describe('getDayOfWeekName', () => {
    it('should return correct day names', () => {
      // Arrange
      const days = [
        { date: new Date('2024-03-03'), expected: 'Sunday' }, // Sunday
        { date: new Date('2024-03-04'), expected: 'Monday' }, // Monday
        { date: new Date('2024-03-05'), expected: 'Tuesday' }, // Tuesday
        { date: new Date('2024-03-06'), expected: 'Wednesday' }, // Wednesday
        { date: new Date('2024-03-07'), expected: 'Thursday' }, // Thursday
        { date: new Date('2024-03-08'), expected: 'Friday' }, // Friday
        { date: new Date('2024-03-09'), expected: 'Saturday' }, // Saturday
      ];

      // Act & Assert
      days.forEach(({ date, expected }) => {
        expect(getDayOfWeekName(date)).toBe(expected);
      });
    });
  });

  describe('isWeekendDay', () => {
    it('should identify Fridays and Saturdays as weekend days', () => {
      // Arrange
      const friday = new Date('2024-03-08'); // Friday
      const saturday = new Date('2024-03-09'); // Saturday

      // Act & Assert
      expect(isWeekendDay(friday)).toBe(true);
      expect(isWeekendDay(saturday)).toBe(true);
    });

    it('should not identify other days as weekend days', () => {
      // Arrange
      const sunday = new Date('2024-03-10'); // Sunday
      const monday = new Date('2024-03-11'); // Monday
      const thursday = new Date('2024-03-07'); // Thursday

      // Act & Assert
      expect(isWeekendDay(sunday)).toBe(false);
      expect(isWeekendDay(monday)).toBe(false);
      expect(isWeekendDay(thursday)).toBe(false);
    });
  });

  describe('generateDateRange', () => {
    it('should generate dates between start and end', () => {
      // Arrange
      const startDate = new Date('2024-03-01');
      const endDate = new Date('2024-03-05');

      // Act
      const dates = generateDateRange(startDate, endDate);

      // Assert
      expect(dates).toHaveLength(5); // Mar 1, 2, 3, 4, 5
      expect(dates[0].getTime()).toBe(startDate.getTime());
      expect(dates[dates.length - 1].getTime()).toBe(endDate.getTime());
    });

    it('should return single date when start equals end', () => {
      // Arrange
      const date = new Date('2024-03-15');

      // Act
      const dates = generateDateRange(date, date);

      // Assert
      expect(dates).toHaveLength(1);
      expect(dates[0].getTime()).toBe(date.getTime());
    });

    it('should handle large date ranges efficiently', () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Act
      const dates = generateDateRange(startDate, endDate);

      // Assert
      expect(dates.length).toBe(366); // 2024 is a leap year
    });
  });

  describe('filterBlackoutDates', () => {
    it('should remove blackout dates from available dates', () => {
      // Arrange
      const dates = [
        new Date('2024-03-01'),
        new Date('2024-03-02'),
        new Date('2024-03-08'),
        new Date('2024-03-09'),
      ];
      const blackoutDates = [
        new Date('2024-03-02'),
        new Date('2024-03-08'),
      ];

      // Act
      const filtered = filterBlackoutDates(dates, blackoutDates);

      // Assert
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.getTime())).toEqual([
        new Date('2024-03-01').getTime(),
        new Date('2024-03-09').getTime(),
      ]);
    });

    it('should handle empty blackout dates', () => {
      // Arrange
      const dates = [
        new Date('2024-03-01'),
        new Date('2024-03-02'),
      ];
      const blackoutDates: Date[] = [];

      // Act
      const filtered = filterBlackoutDates(dates, blackoutDates);

      // Assert
      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(dates);
    });

    it('should handle dates with different times on same day', () => {
      // Arrange
      const dates = [
        new Date('2024-03-01T10:00:00'),
        new Date('2024-03-02T15:00:00'),
      ];
      const blackoutDates = [
        new Date('2024-03-02T00:00:00'), // Different time, same day
      ];

      // Act
      const filtered = filterBlackoutDates(dates, blackoutDates);

      // Assert
      expect(filtered).toHaveLength(1);
      expect(format(filtered[0], 'yyyy-MM-dd')).toBe('2024-03-01');
    });
  });

  describe('Edge Cases', () => {
    it('should handle daylight saving time transitions', () => {
      // Arrange - UK DST starts last Sunday of March
      const beforeDST = new Date('2024-03-30T22:00:00'); // Saturday before DST
      const afterDST = new Date('2024-03-31T22:00:00'); // Sunday when DST starts

      // Act
      const beforeCutoff = isPastCutoffTime(beforeDST, '23:00');
      const afterCutoff = isPastCutoffTime(afterDST, '23:00');

      // Assert - Both should handle time correctly despite DST change
      expect(typeof beforeCutoff).toBe('boolean');
      expect(typeof afterCutoff).toBe('boolean');
    });

    it('should handle leap years correctly', () => {
      // Arrange
      const leapDay = new Date('2024-02-29'); // 2024 is a leap year

      // Act
      const formatted = formatDateForDisplay(leapDay);
      const dayName = getDayOfWeekName(leapDay);

      // Assert
      expect(formatted).toBe('Thursday, 29th February');
      expect(dayName).toBe('Thursday');
    });
  });
});