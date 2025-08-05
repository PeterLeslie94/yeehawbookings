import { prisma } from '@/app/lib/prisma';
import { GET } from '@/app/api/bookings/available-dates/route';
import { NextRequest } from 'next/server';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Mock the response object
function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/bookings/available-dates', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.blackoutDate.deleteMany();
    await prisma.dailyCutoffTime.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Date Filtering', () => {
    it('should return only Fridays and Saturdays for the next 3 months', async () => {
      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.availableDates).toBeDefined();
      expect(Array.isArray(data.availableDates)).toBe(true);
      
      // Check all returned dates are Fridays or Saturdays
      data.availableDates.forEach((dateInfo: any) => {
        const date = new Date(dateInfo.date);
        const dayOfWeek = date.getDay();
        expect([5, 6]).toContain(dayOfWeek); // 5 = Friday, 6 = Saturday
      });

      // Check date range (should be next 3 months)
      if (data.availableDates.length > 0) {
        const firstDate = new Date(data.availableDates[0].date);
        const lastDate = new Date(data.availableDates[data.availableDates.length - 1].date);
        const threeMonthsFromNow = addDays(new Date(), 90);
        
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(new Date().setHours(0, 0, 0, 0));
        expect(lastDate.getTime()).toBeLessThanOrEqual(threeMonthsFromNow.getTime());
      }
    });

    it('should not include past dates', async () => {
      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      const today = new Date().setHours(0, 0, 0, 0);
      data.availableDates.forEach((dateInfo: any) => {
        const date = new Date(dateInfo.date).getTime();
        expect(date).toBeGreaterThanOrEqual(today);
      });
    });

    it('should accept optional date range parameters', async () => {
      // Arrange
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      // Act
      const request = createMockRequest(
        `/api/bookings/available-dates?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      data.availableDates.forEach((dateInfo: any) => {
        const date = new Date(dateInfo.date);
        expect(date.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(date.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });
  });

  describe('Blackout Date Integration', () => {
    it('should exclude blackout dates from available dates', async () => {
      // Arrange
      const nextFriday = getNextFriday();
      const blackoutDate = format(nextFriday, 'yyyy-MM-dd');
      
      await prisma.blackoutDate.create({
        data: {
          date: new Date(blackoutDate),
          reason: 'Private event',
        },
      });

      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      const blackoutFound = data.availableDates.some(
        (dateInfo: any) => dateInfo.date === blackoutDate && !dateInfo.isBlackedOut
      );
      expect(blackoutFound).toBe(false);
    });

    it('should mark blackout dates with isBlackedOut flag if includeBlackouts is true', async () => {
      // Arrange
      const nextFriday = getNextFriday();
      const blackoutDate = format(nextFriday, 'yyyy-MM-dd');
      
      await prisma.blackoutDate.create({
        data: {
          date: new Date(blackoutDate),
          reason: 'Maintenance',
        },
      });

      // Act
      const request = createMockRequest('/api/bookings/available-dates?includeBlackouts=true');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      const blackoutInfo = data.availableDates.find(
        (dateInfo: any) => dateInfo.date === blackoutDate
      );
      expect(blackoutInfo).toBeDefined();
      expect(blackoutInfo.isBlackedOut).toBe(true);
      expect(blackoutInfo.blackoutReason).toBe('Maintenance');
    });
  });

  describe('Cut-off Time Integration', () => {
    it('should include default cut-off time (23:00) for all dates', async () => {
      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      data.availableDates.forEach((dateInfo: any) => {
        expect(dateInfo.cutoffTime).toBe('23:00');
      });
    });

    it('should use custom cut-off times when configured', async () => {
      // Arrange
      const friday = getNextFriday();
      const fridayDate = format(friday, 'yyyy-MM-dd');
      
      await prisma.dailyCutoffTime.create({
        data: {
          date: new Date(fridayDate),
          cutoffTime: '22:00', // 10 PM custom cutoff
        },
      });

      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      const fridayInfo = data.availableDates.find(
        (dateInfo: any) => dateInfo.date === fridayDate
      );
      expect(fridayInfo).toBeDefined();
      expect(fridayInfo.cutoffTime).toBe('22:00');
    });

    it('should mark dates as past cut-off when appropriate', async () => {
      // Arrange - Create a cut-off time for today that has already passed
      const today = new Date();
      const todayDate = format(today, 'yyyy-MM-dd');
      const pastTime = format(setMinutes(setHours(today, today.getHours() - 2), 0), 'HH:mm');
      
      // Only create if today is Friday or Saturday
      if (today.getDay() === 5 || today.getDay() === 6) {
        await prisma.dailyCutoffTime.create({
          data: {
            date: new Date(todayDate),
            cutoffTime: pastTime,
          },
        });

        // Act
        const request = createMockRequest('/api/bookings/available-dates');
        const response = await GET(request);
        const data = await response.json();

        // Assert
        const todayInfo = data.availableDates.find(
          (dateInfo: any) => dateInfo.date === todayDate
        );
        if (todayInfo) {
          expect(todayInfo.isPastCutoff).toBe(true);
        }
      }
    });
  });

  describe('Timezone Handling', () => {
    it('should return all times in UK timezone', async () => {
      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.timezone).toBe('Europe/London');
      data.availableDates.forEach((dateInfo: any) => {
        expect(dateInfo.timezone).toBe('Europe/London');
      });
    });

    it('should calculate cut-off times based on UK timezone', async () => {
      // Arrange
      const friday = getNextFriday();
      const fridayDate = format(friday, 'yyyy-MM-dd');
      
      await prisma.dailyCutoffTime.create({
        data: {
          date: new Date(fridayDate),
          cutoffTime: '23:00',
        },
      });

      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      const fridayInfo = data.availableDates.find(
        (dateInfo: any) => dateInfo.date === fridayDate
      );
      expect(fridayInfo).toBeDefined();
      expect(fridayInfo.cutoffTimeUK).toMatch(/11:00 PM/);
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted date information', async () => {
      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data).toHaveProperty('availableDates');
      expect(data).toHaveProperty('timezone');
      expect(data).toHaveProperty('currentTimeUK');
      
      if (data.availableDates.length > 0) {
        const sampleDate = data.availableDates[0];
        expect(sampleDate).toHaveProperty('date');
        expect(sampleDate).toHaveProperty('dayOfWeek');
        expect(sampleDate).toHaveProperty('cutoffTime');
        expect(sampleDate).toHaveProperty('cutoffTimeUK');
        expect(sampleDate).toHaveProperty('isBlackedOut');
        expect(sampleDate).toHaveProperty('isPastCutoff');
        
        // Check date format (YYYY-MM-DD)
        expect(sampleDate.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        
        // Check day of week
        expect(['Friday', 'Saturday']).toContain(sampleDate.dayOfWeek);
      }
    });

    it('should include formatted display date', async () => {
      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      if (data.availableDates.length > 0) {
        const sampleDate = data.availableDates[0];
        expect(sampleDate).toHaveProperty('formattedDate');
        // Should be in format like "Friday, 15th March"
        expect(sampleDate.formattedDate).toMatch(/^(Friday|Saturday), \d{1,2}(st|nd|rd|th) \w+$/);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid date parameters', async () => {
      // Act
      const request = createMockRequest('/api/bookings/available-dates?startDate=invalid-date');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 when end date is before start date', async () => {
      // Arrange
      const startDate = format(addDays(new Date(), 10), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Act
      const request = createMockRequest(
        `/api/bookings/available-dates?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('End date must be after start date');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange - Mock a database error
      const originalFindMany = prisma.blackoutDate.findMany;
      prisma.blackoutDate.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act
      const request = createMockRequest('/api/bookings/available-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();

      // Cleanup
      prisma.blackoutDate.findMany = originalFindMany;
    });
  });

  describe('Performance', () => {
    it('should limit date range to prevent excessive data', async () => {
      // Arrange - Request a year's worth of dates
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 365), 'yyyy-MM-dd');

      // Act
      const request = createMockRequest(
        `/api/bookings/available-dates?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request);
      const data = await response.json();

      // Assert - Should limit to reasonable number of dates
      expect(response.status).toBe(200);
      expect(data.availableDates.length).toBeLessThanOrEqual(100); // Max ~100 Fri/Sat in 1 year
    });
  });
});

// Helper function to get next Friday
function getNextFriday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  return addDays(today, daysUntilFriday);
}