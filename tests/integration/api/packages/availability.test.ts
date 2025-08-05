import { prisma } from '@/app/lib/prisma';

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

// Import route handler after mocking
const { GET } = require('@/app/api/packages/availability/route');
const { NextRequest } = require('next/server');

// Helper to create mock requests
function createMockRequest(url: string): any {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/packages/availability', () => {
  let vipPackage: any;
  let tablePackage: any;
  let testDate: Date;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.bookingItem.deleteMany();
    await prisma.packageAvailability.deleteMany();
    await prisma.packagePricing.deleteMany();
    await prisma.package.deleteMany();
    await prisma.blackoutDate.deleteMany();

    // Create test packages
    vipPackage = await prisma.package.create({
      data: {
        name: 'VIP Booth',
        description: 'Premium VIP booth',
        maxGuests: 8,
        isActive: true
      }
    });

    tablePackage = await prisma.package.create({
      data: {
        name: 'Reserved Table',
        description: 'Reserved table',
        maxGuests: 4,
        isActive: true
      }
    });

    // Set test date to next Friday in UTC
    const now = new Date();
    const currentDay = now.getUTCDay();
    const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;
    testDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilFriday));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Basic Functionality', () => {
    it('should return availability for packages on specified date', async () => {
      // Create availability records
      await prisma.packageAvailability.create({
        data: {
          packageId: vipPackage.id,
          date: testDate,
          isAvailable: true,
          totalQuantity: 5,
          availableQuantity: 3
        }
      });

      await prisma.packageAvailability.create({
        data: {
          packageId: tablePackage.id,
          date: testDate,
          isAvailable: true,
          totalQuantity: 10,
          availableQuantity: 5
        }
      });

      const dateStr = testDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.date).toBe(dateStr);
      expect(data.availability).toHaveLength(2);
      
      const vipAvailability = data.availability.find((a: any) => a.packageId === vipPackage.id);
      expect(vipAvailability).toBeDefined();
      expect(vipAvailability.isAvailable).toBe(true);
      expect(vipAvailability.availableQuantity).toBe(3);
      expect(vipAvailability.packageName).toBe('VIP Booth');
    });

    it('should only return active packages availability', async () => {
      const inactivePackage = await prisma.package.create({
        data: {
          name: 'Inactive Package',
          description: 'Not available',
          maxGuests: 6,
          isActive: false
        }
      });

      await prisma.packageAvailability.create({
        data: {
          packageId: vipPackage.id,
          date: testDate,
          isAvailable: true,
          totalQuantity: 5,
          availableQuantity: 3
        }
      });

      await prisma.packageAvailability.create({
        data: {
          packageId: inactivePackage.id,
          date: testDate,
          isAvailable: true,
          totalQuantity: 3,
          availableQuantity: 2
        }
      });

      const dateStr = testDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toHaveLength(2); // Both active packages
      
      const packageIds = data.availability.map((a: any) => a.packageId);
      expect(packageIds).toContain(vipPackage.id);
      expect(packageIds).toContain(tablePackage.id);
      expect(packageIds).not.toContain(inactivePackage.id);
    });
  });

  describe('Date Validation', () => {
    it('should return 400 if no date provided', async () => {
      const request = createMockRequest('http://localhost:3000/api/packages/availability');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Date parameter is required');
    });

    it('should return 400 for invalid date format', async () => {
      const request = createMockRequest('http://localhost:3000/api/packages/availability?date=invalid-date');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid date format. Use YYYY-MM-DD');
    });

    it('should return 400 for non-Friday/Saturday dates', async () => {
      // Get next Monday
      const monday = new Date();
      const dayOfWeek = monday.getDay();
      const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
      monday.setDate(monday.getDate() + daysUntilMonday);
      
      const dateStr = monday.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bookings are only available on Fridays and Saturdays');
    });

    it('should return 400 for past dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const dateStr = yesterday.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot check availability for past dates');
    });
  });

  describe('Blackout Dates', () => {
    it('should return unavailable for blackout dates', async () => {
      // Create blackout date
      await prisma.blackoutDate.create({
        data: {
          date: testDate,
          reason: 'Private event'
        }
      });

      // Create availability records
      await prisma.packageAvailability.create({
        data: {
          packageId: vipPackage.id,
          date: testDate,
          isAvailable: true,
          totalQuantity: 5,
          availableQuantity: 3
        }
      });

      const dateStr = testDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isBlackoutDate).toBe(true);
      expect(data.blackoutReason).toBe('Private event');
      expect(data.availability).toEqual([]);
    });
  });

  describe('Missing Availability Data', () => {
    it('should handle packages with no availability record for date', async () => {
      // Only create availability for one package
      await prisma.packageAvailability.create({
        data: {
          packageId: vipPackage.id,
          date: testDate,
          isAvailable: true,
          totalQuantity: 5,
          availableQuantity: 3
        }
      });

      const dateStr = testDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toHaveLength(2); // Both packages should be included
      
      const vipAvailability = data.availability.find((a: any) => a.packageId === vipPackage.id);
      expect(vipAvailability.isAvailable).toBe(true);
      expect(vipAvailability.availableQuantity).toBe(3);
      
      const tableAvailability = data.availability.find((a: any) => a.packageId === tablePackage.id);
      expect(tableAvailability.isAvailable).toBe(false);
      expect(tableAvailability.availableQuantity).toBe(0);
      expect(tableAvailability.message).toBe('No availability data');
    });
  });

  describe('Response Format', () => {
    it('should include all required fields in response', async () => {
      await prisma.packageAvailability.create({
        data: {
          packageId: vipPackage.id,
          date: testDate,
          isAvailable: true,
          totalQuantity: 5,
          availableQuantity: 3
        }
      });

      const dateStr = testDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('date');
      expect(data).toHaveProperty('isBlackoutDate');
      expect(data).toHaveProperty('availability');
      
      const availability = data.availability[0];
      expect(availability).toHaveProperty('packageId');
      expect(availability).toHaveProperty('packageName');
      expect(availability).toHaveProperty('isAvailable');
      expect(availability).toHaveProperty('availableQuantity');
      expect(availability).toHaveProperty('maxGuests');
    });

    it('should order availability by package name', async () => {
      const zPackage = await prisma.package.create({
        data: {
          name: 'Z Package',
          description: 'Last package',
          maxGuests: 4,
          isActive: true
        }
      });

      await prisma.packageAvailability.createMany({
        data: [
          {
            packageId: zPackage.id,
            date: testDate,
            isAvailable: true,
            totalQuantity: 5,
            availableQuantity: 2
          },
          {
            packageId: vipPackage.id,
            date: testDate,
            isAvailable: true,
            totalQuantity: 5,
            availableQuantity: 3
          },
          {
            packageId: tablePackage.id,
            date: testDate,
            isAvailable: true,
            totalQuantity: 10,
            availableQuantity: 5
          }
        ]
      });

      const dateStr = testDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toHaveLength(3);
      expect(data.availability[0].packageName).toBe('Reserved Table');
      expect(data.availability[1].packageName).toBe('VIP Booth');
      expect(data.availability[2].packageName).toBe('Z Package');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      await prisma.$disconnect();
      
      const dateStr = testDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/availability?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch availability');
      
      await prisma.$connect();
    });
  });
});