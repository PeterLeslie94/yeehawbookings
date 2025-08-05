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
const { GET } = require('@/app/api/packages/pricing/route');
const { NextRequest } = require('next/server');

// Helper to create mock requests
function createMockRequest(url: string): any {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/packages/pricing', () => {
  let vipPackage: any;
  let tablePackage: any;
  let fridayDate: Date;
  let saturdayDate: Date;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.bookingItem.deleteMany();
    await prisma.packagePricing.deleteMany();
    await prisma.package.deleteMany();

    // Create test packages
    vipPackage = await prisma.package.create({
      data: {
        name: 'VIP Booth',
        description: 'Premium VIP booth',
        maxGuests: 8,
        isActive: true,
        defaultPrice: 500.00
      }
    });

    tablePackage = await prisma.package.create({
      data: {
        name: 'Reserved Table',
        description: 'Reserved table',
        maxGuests: 4,
        isActive: true,
        defaultPrice: 200.00
      }
    });

    // Set test dates to next Friday and Saturday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    
    fridayDate = new Date();
    fridayDate.setDate(today.getDate() + daysUntilFriday);
    fridayDate.setHours(0, 0, 0, 0);
    
    saturdayDate = new Date(fridayDate);
    saturdayDate.setDate(fridayDate.getDate() + 1);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Basic Functionality', () => {
    it('should return pricing for packages on specified date', async () => {
      // Create pricing records
      await prisma.packagePricing.create({
        data: {
          packageId: vipPackage.id,
          date: fridayDate,
          price: 450.00
        }
      });

      await prisma.packagePricing.create({
        data: {
          packageId: tablePackage.id,
          date: fridayDate,
          price: 180.00
        }
      });

      const dateStr = fridayDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.date).toBe(dateStr);
      expect(data.pricing).toHaveLength(2);
      
      const vipPricing = data.pricing.find((p: any) => p.packageId === vipPackage.id);
      expect(vipPricing).toBeDefined();
      expect(vipPricing.price).toBe(450.00);
      expect(vipPricing.packageName).toBe('VIP Booth');
      expect(vipPricing.isCustomPrice).toBe(true);
    });

    it('should only return active packages pricing', async () => {
      const inactivePackage = await prisma.package.create({
        data: {
          name: 'Inactive Package',
          description: 'Not available',
          maxGuests: 6,
          isActive: false,
          defaultPrice: 300.00
        }
      });

      await prisma.packagePricing.create({
        data: {
          packageId: vipPackage.id,
          date: fridayDate,
          price: 450.00
        }
      });

      await prisma.packagePricing.create({
        data: {
          packageId: inactivePackage.id,
          date: fridayDate,
          price: 250.00
        }
      });

      const dateStr = fridayDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pricing).toHaveLength(2); // VIP and Table (active packages)
      expect(data.pricing.map((p: any) => p.packageId)).not.toContain(inactivePackage.id);
    });
  });

  describe('Default Pricing Fallback', () => {
    it('should use default price when no date-specific pricing exists', async () => {
      // Only create pricing for VIP package
      await prisma.packagePricing.create({
        data: {
          packageId: vipPackage.id,
          date: fridayDate,
          price: 450.00
        }
      });

      const dateStr = fridayDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pricing).toHaveLength(2);
      
      const vipPricing = data.pricing.find((p: any) => p.packageId === vipPackage.id);
      expect(vipPricing.price).toBe(450.00);
      expect(vipPricing.isCustomPrice).toBe(true);
      
      const tablePricing = data.pricing.find((p: any) => p.packageId === tablePackage.id);
      expect(tablePricing.price).toBe(200.00);
      expect(tablePricing.isCustomPrice).toBe(false);
    });

    it('should handle packages with no default price', async () => {
      const noDefaultPackage = await prisma.package.create({
        data: {
          name: 'No Default Price Package',
          description: 'Package without default price',
          maxGuests: 6,
          isActive: true
          // No defaultPrice set
        }
      });

      const dateStr = fridayDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      const noDefaultPricing = data.pricing.find((p: any) => p.packageId === noDefaultPackage.id);
      expect(noDefaultPricing.price).toBe(0);
      expect(noDefaultPricing.isCustomPrice).toBe(false);
      expect(noDefaultPricing.message).toBe('No pricing available');
    });
  });

  describe('Weekend Pricing Differences', () => {
    it('should return different prices for Friday vs Saturday', async () => {
      // Friday pricing
      await prisma.packagePricing.create({
        data: {
          packageId: vipPackage.id,
          date: fridayDate,
          price: 450.00
        }
      });

      // Saturday pricing (higher)
      await prisma.packagePricing.create({
        data: {
          packageId: vipPackage.id,
          date: saturdayDate,
          price: 600.00
        }
      });

      // Test Friday
      const fridayStr = fridayDate.toISOString().split('T')[0];
      const fridayRequest = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${fridayStr}`);
      const fridayResponse = await GET(fridayRequest);
      const fridayData = await fridayResponse.json();

      expect(fridayResponse.status).toBe(200);
      const fridayVipPricing = fridayData.pricing.find((p: any) => p.packageId === vipPackage.id);
      expect(fridayVipPricing.price).toBe(450.00);

      // Test Saturday
      const saturdayStr = saturdayDate.toISOString().split('T')[0];
      const saturdayRequest = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${saturdayStr}`);
      const saturdayResponse = await GET(saturdayRequest);
      const saturdayData = await saturdayResponse.json();

      expect(saturdayResponse.status).toBe(200);
      const saturdayVipPricing = saturdayData.pricing.find((p: any) => p.packageId === vipPackage.id);
      expect(saturdayVipPricing.price).toBe(600.00);
    });
  });

  describe('Date Validation', () => {
    it('should return 400 if no date provided', async () => {
      const request = createMockRequest('http://localhost:3000/api/packages/pricing');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Date parameter is required');
    });

    it('should return 400 for invalid date format', async () => {
      const request = createMockRequest('http://localhost:3000/api/packages/pricing?date=invalid-date');
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
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Pricing is only available for Fridays and Saturdays');
    });

    it('should allow past dates for historical pricing lookup', async () => {
      const lastFriday = new Date(fridayDate);
      lastFriday.setDate(fridayDate.getDate() - 7);

      await prisma.packagePricing.create({
        data: {
          packageId: vipPackage.id,
          date: lastFriday,
          price: 400.00
        }
      });

      const dateStr = lastFriday.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const vipPricing = data.pricing.find((p: any) => p.packageId === vipPackage.id);
      expect(vipPricing.price).toBe(400.00);
    });
  });

  describe('Response Format', () => {
    it('should include all required fields in response', async () => {
      await prisma.packagePricing.create({
        data: {
          packageId: vipPackage.id,
          date: fridayDate,
          price: 450.00
        }
      });

      const dateStr = fridayDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('date');
      expect(data).toHaveProperty('dayOfWeek');
      expect(data).toHaveProperty('pricing');
      
      const pricing = data.pricing[0];
      expect(pricing).toHaveProperty('packageId');
      expect(pricing).toHaveProperty('packageName');
      expect(pricing).toHaveProperty('price');
      expect(pricing).toHaveProperty('isCustomPrice');
      expect(pricing).toHaveProperty('maxGuests');
    });

    it('should order pricing by package name', async () => {
      const zPackage = await prisma.package.create({
        data: {
          name: 'Z Package',
          description: 'Last package',
          maxGuests: 4,
          isActive: true,
          defaultPrice: 150.00
        }
      });

      await prisma.packagePricing.createMany({
        data: [
          {
            packageId: zPackage.id,
            date: fridayDate,
            price: 175.00
          },
          {
            packageId: vipPackage.id,
            date: fridayDate,
            price: 450.00
          },
          {
            packageId: tablePackage.id,
            date: fridayDate,
            price: 180.00
          }
        ]
      });

      const dateStr = fridayDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pricing).toHaveLength(3);
      expect(data.pricing[0].packageName).toBe('Reserved Table');
      expect(data.pricing[1].packageName).toBe('VIP Booth');
      expect(data.pricing[2].packageName).toBe('Z Package');
    });

    it('should include day of week in response', async () => {
      const fridayStr = fridayDate.toISOString().split('T')[0];
      const fridayRequest = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${fridayStr}`);
      const fridayResponse = await GET(fridayRequest);
      const fridayData = await fridayResponse.json();

      expect(fridayData.dayOfWeek).toBe('Friday');

      const saturdayStr = saturdayDate.toISOString().split('T')[0];
      const saturdayRequest = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${saturdayStr}`);
      const saturdayResponse = await GET(saturdayRequest);
      const saturdayData = await saturdayResponse.json();

      expect(saturdayData.dayOfWeek).toBe('Saturday');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      await prisma.$disconnect();
      
      const dateStr = fridayDate.toISOString().split('T')[0];
      const request = createMockRequest(`http://localhost:3000/api/packages/pricing?date=${dateStr}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch pricing');
      
      await prisma.$connect();
    });
  });
});