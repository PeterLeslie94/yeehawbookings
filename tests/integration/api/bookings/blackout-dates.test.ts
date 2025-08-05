import { prisma } from '@/app/lib/prisma';
import { format, addDays } from 'date-fns';

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: class {
    nextUrl: any;
    constructor(url: URL) {
      this.nextUrl = {
        searchParams: url.searchParams
      };
    }
  },
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {}))
    })
  }
}));

// Import after mocking
const { GET } = require('@/app/api/bookings/blackout-dates/route');
const { NextRequest } = require('next/server');

// Mock the response object
function createMockRequest(url: string): any {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/bookings/blackout-dates', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.blackoutDate.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Fetching Blackout Dates', () => {
    it('should return empty array when no blackout dates exist', async () => {
      // Act
      const request = createMockRequest('/api/bookings/blackout-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.blackoutDates).toEqual([]);
    });

    it('should return all blackout dates', async () => {
      // Arrange
      const dates = [
        { date: new Date(), reason: 'Private event' },
        { date: addDays(new Date(), 7), reason: 'Maintenance' },
        { date: addDays(new Date(), 14), reason: 'Holiday' },
      ];

      await prisma.blackoutDate.createMany({
        data: dates,
      });

      // Act
      const request = createMockRequest('/api/bookings/blackout-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.blackoutDates).toHaveLength(3);
      expect(data.blackoutDates[0]).toHaveProperty('id');
      expect(data.blackoutDates[0]).toHaveProperty('date');
      expect(data.blackoutDates[0]).toHaveProperty('reason');
    });

    it('should return blackout dates sorted by date ascending', async () => {
      // Arrange
      const date1 = addDays(new Date(), 14);
      const date2 = addDays(new Date(), 7);
      const date3 = new Date();

      await prisma.blackoutDate.create({ data: { date: date1, reason: 'Event 1' } });
      await prisma.blackoutDate.create({ data: { date: date2, reason: 'Event 2' } });
      await prisma.blackoutDate.create({ data: { date: date3, reason: 'Event 3' } });

      // Act
      const request = createMockRequest('/api/bookings/blackout-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.blackoutDates).toHaveLength(3);
      
      // Check dates are in ascending order
      const dates = data.blackoutDates.map((bd: any) => new Date(bd.date).getTime());
      expect(dates[0]).toBeLessThan(dates[1]);
      expect(dates[1]).toBeLessThan(dates[2]);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter blackout dates by date range', async () => {
      // Arrange
      const pastDate = addDays(new Date(), -10);
      const futureDate1 = addDays(new Date(), 5);
      const futureDate2 = addDays(new Date(), 15);
      const farFutureDate = addDays(new Date(), 60);

      await prisma.blackoutDate.createMany({
        data: [
          { date: pastDate, reason: 'Past event' },
          { date: futureDate1, reason: 'Future event 1' },
          { date: futureDate2, reason: 'Future event 2' },
          { date: farFutureDate, reason: 'Far future event' },
        ],
      });

      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      // Act
      const request = createMockRequest(
        `/api/bookings/blackout-dates?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.blackoutDates).toHaveLength(2);
      
      data.blackoutDates.forEach((bd: any) => {
        const date = new Date(bd.date);
        expect(date.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(date.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    it('should exclude past blackout dates by default', async () => {
      // Arrange
      const yesterday = addDays(new Date(), -1);
      const tomorrow = addDays(new Date(), 1);
      const nextWeek = addDays(new Date(), 7);

      await prisma.blackoutDate.createMany({
        data: [
          { date: yesterday, reason: 'Past event' },
          { date: tomorrow, reason: 'Tomorrow event' },
          { date: nextWeek, reason: 'Next week event' },
        ],
      });

      // Act
      const request = createMockRequest('/api/bookings/blackout-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Should not include yesterday's blackout
      const dates = data.blackoutDates.map((bd: any) => new Date(bd.date).getTime());
      expect(dates).not.toContain(yesterday.getTime());
      expect(data.blackoutDates).toHaveLength(2);
    });

    it('should include past dates when includePast=true', async () => {
      // Arrange
      const yesterday = addDays(new Date(), -1);
      const tomorrow = addDays(new Date(), 1);

      await prisma.blackoutDate.createMany({
        data: [
          { date: yesterday, reason: 'Past event' },
          { date: tomorrow, reason: 'Tomorrow event' },
        ],
      });

      // Act
      const request = createMockRequest('/api/bookings/blackout-dates?includePast=true');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.blackoutDates).toHaveLength(2);
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted blackout date objects', async () => {
      // Arrange
      const blackoutDate = addDays(new Date(), 7);
      const reason = 'Venue maintenance';
      
      await prisma.blackoutDate.create({
        data: { date: blackoutDate, reason },
      });

      // Act
      const request = createMockRequest('/api/bookings/blackout-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.blackoutDates).toHaveLength(1);
      
      const blackout = data.blackoutDates[0];
      expect(blackout).toHaveProperty('id');
      expect(blackout).toHaveProperty('date');
      expect(blackout).toHaveProperty('reason');
      expect(blackout).toHaveProperty('formattedDate');
      expect(blackout).toHaveProperty('dayOfWeek');
      
      // Check date format (ISO string)
      expect(blackout.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      
      // Check formatted date (e.g., "Friday, 15th March 2024")
      expect(blackout.formattedDate).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), \d{1,2}(st|nd|rd|th) \w+ \d{4}$/);
      
      // Check reason
      expect(blackout.reason).toBe(reason);
    });

    it('should handle null reasons gracefully', async () => {
      // Arrange
      await prisma.blackoutDate.create({
        data: { 
          date: addDays(new Date(), 7), 
          reason: null 
        },
      });

      // Act
      const request = createMockRequest('/api/bookings/blackout-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.blackoutDates[0].reason).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid date parameters', async () => {
      // Act
      const request = createMockRequest('/api/bookings/blackout-dates?startDate=invalid-date');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error).toContain('Invalid date format');
    });

    it('should return 400 when end date is before start date', async () => {
      // Arrange
      const startDate = format(addDays(new Date(), 10), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Act
      const request = createMockRequest(
        `/api/bookings/blackout-dates?startDate=${startDate}&endDate=${endDate}`
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
      prisma.blackoutDate.findMany = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      // Act
      const request = createMockRequest('/api/bookings/blackout-dates');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.error).toContain('Failed to fetch blackout dates');

      // Cleanup
      prisma.blackoutDate.findMany = originalFindMany;
    });
  });

  describe('Caching Headers', () => {
    it('should include appropriate cache headers', async () => {
      // Arrange
      await prisma.blackoutDate.create({
        data: { date: addDays(new Date(), 7), reason: 'Event' },
      });

      // Act
      const request = createMockRequest('/api/bookings/blackout-dates');
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBeDefined();
      // Should have a reasonable cache time since blackout dates don't change frequently
      expect(response.headers.get('Cache-Control')).toContain('max-age=');
    });
  });

  describe('Pagination', () => {
    it('should support pagination with limit and offset', async () => {
      // Arrange - Create 10 blackout dates
      const dates = Array.from({ length: 10 }, (_, i) => ({
        date: addDays(new Date(), i),
        reason: `Event ${i}`,
      }));
      await prisma.blackoutDate.createMany({ data: dates });

      // Act - Get first page
      const request1 = createMockRequest('/api/bookings/blackout-dates?limit=5&offset=0');
      const response1 = await GET(request1);
      const data1 = await response1.json();

      // Act - Get second page
      const request2 = createMockRequest('/api/bookings/blackout-dates?limit=5&offset=5');
      const response2 = await GET(request2);
      const data2 = await response2.json();

      // Assert
      expect(response1.status).toBe(200);
      expect(data1.blackoutDates).toHaveLength(5);
      expect(data1.total).toBe(10);
      expect(data1.hasMore).toBe(true);

      expect(response2.status).toBe(200);
      expect(data2.blackoutDates).toHaveLength(5);
      expect(data2.total).toBe(10);
      expect(data2.hasMore).toBe(false);

      // Ensure no overlap between pages
      const ids1 = data1.blackoutDates.map((bd: any) => bd.id);
      const ids2 = data2.blackoutDates.map((bd: any) => bd.id);
      const intersection = ids1.filter((id: string) => ids2.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });
});