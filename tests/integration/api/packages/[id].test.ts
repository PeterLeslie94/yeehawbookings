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
const { GET } = require('@/app/api/packages/[id]/route');
const { NextRequest } = require('next/server');

// Helper to create mock requests
function createMockRequest(url: string): any {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

// Mock params object
function createMockParams(id: string): any {
  return { params: { id } };
}

describe('GET /api/packages/[id]', () => {
  let testPackage: any;
  let fridayDate: Date;
  let saturdayDate: Date;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.bookingItem.deleteMany();
    await prisma.packageAvailability.deleteMany();
    await prisma.packagePricing.deleteMany();
    await prisma.package.deleteMany();

    // Create test package
    testPackage = await prisma.package.create({
      data: {
        name: 'VIP Booth',
        description: 'Premium VIP booth with bottle service',
        maxGuests: 8,
        isActive: true,
        defaultPrice: 500.00
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
    it('should return package details by ID', async () => {
      const request = createMockRequest(`http://localhost:3000/api/packages/${testPackage.id}`);
      const params = createMockParams(testPackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.package).toBeDefined();
      expect(data.package.id).toBe(testPackage.id);
      expect(data.package.name).toBe('VIP Booth');
      expect(data.package.description).toBe('Premium VIP booth with bottle service');
      expect(data.package.maxGuests).toBe(8);
      expect(data.package.defaultPrice).toBe(500.00);
      expect(data.package.isActive).toBe(true);
    });

    it('should return 404 for non-existent package', async () => {
      const fakeId = 'cuid_1234567890';
      const request = createMockRequest(`http://localhost:3000/api/packages/${fakeId}`);
      const params = createMockParams(fakeId);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Package not found');
    });

    it('should return 404 for inactive package by default', async () => {
      const inactivePackage = await prisma.package.create({
        data: {
          name: 'Inactive Package',
          description: 'This package is no longer available',
          maxGuests: 6,
          isActive: false,
          defaultPrice: 300.00
        }
      });

      const request = createMockRequest(`http://localhost:3000/api/packages/${inactivePackage.id}`);
      const params = createMockParams(inactivePackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Package not found or inactive');
    });
  });

  describe('Including Related Data', () => {
    it('should include upcoming availability when requested', async () => {
      // Create availability records
      await prisma.packageAvailability.createMany({
        data: [
          {
            packageId: testPackage.id,
            date: fridayDate,
            isAvailable: true,
            availableQuantity: 3
          },
          {
            packageId: testPackage.id,
            date: saturdayDate,
            isAvailable: true,
            availableQuantity: 2
          }
        ]
      });

      const request = createMockRequest(`http://localhost:3000/api/packages/${testPackage.id}?includeAvailability=true`);
      const params = createMockParams(testPackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.package.availability).toBeDefined();
      expect(data.package.availability).toHaveLength(2);
      expect(data.package.availability[0].date).toBe(fridayDate.toISOString().split('T')[0]);
      expect(data.package.availability[0].isAvailable).toBe(true);
      expect(data.package.availability[0].availableQuantity).toBe(3);
    });

    it('should include upcoming pricing when requested', async () => {
      // Create pricing records
      await prisma.packagePricing.createMany({
        data: [
          {
            packageId: testPackage.id,
            date: fridayDate,
            price: 450.00
          },
          {
            packageId: testPackage.id,
            date: saturdayDate,
            price: 600.00
          }
        ]
      });

      const request = createMockRequest(`http://localhost:3000/api/packages/${testPackage.id}?includePricing=true`);
      const params = createMockParams(testPackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.package.pricing).toBeDefined();
      expect(data.package.pricing).toHaveLength(2);
      expect(data.package.pricing[0].date).toBe(fridayDate.toISOString().split('T')[0]);
      expect(data.package.pricing[0].price).toBe(450.00);
      expect(data.package.pricing[1].date).toBe(saturdayDate.toISOString().split('T')[0]);
      expect(data.package.pricing[1].price).toBe(600.00);
    });

    it('should include both availability and pricing when both requested', async () => {
      await prisma.packageAvailability.create({
        data: {
          packageId: testPackage.id,
          date: fridayDate,
          isAvailable: true,
          availableQuantity: 3
        }
      });

      await prisma.packagePricing.create({
        data: {
          packageId: testPackage.id,
          date: fridayDate,
          price: 450.00
        }
      });

      const request = createMockRequest(`http://localhost:3000/api/packages/${testPackage.id}?includeAvailability=true&includePricing=true`);
      const params = createMockParams(testPackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.package.availability).toBeDefined();
      expect(data.package.pricing).toBeDefined();
    });

    it('should only include future dates for availability and pricing', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      pastDate.setHours(0, 0, 0, 0);

      // Create past and future records
      await prisma.packageAvailability.createMany({
        data: [
          {
            packageId: testPackage.id,
            date: pastDate,
            isAvailable: true,
            availableQuantity: 5
          },
          {
            packageId: testPackage.id,
            date: fridayDate,
            isAvailable: true,
            availableQuantity: 3
          }
        ]
      });

      await prisma.packagePricing.createMany({
        data: [
          {
            packageId: testPackage.id,
            date: pastDate,
            price: 400.00
          },
          {
            packageId: testPackage.id,
            date: fridayDate,
            price: 450.00
          }
        ]
      });

      const request = createMockRequest(`http://localhost:3000/api/packages/${testPackage.id}?includeAvailability=true&includePricing=true`);
      const params = createMockParams(testPackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.package.availability).toHaveLength(1);
      expect(data.package.availability[0].date).toBe(fridayDate.toISOString().split('T')[0]);
      expect(data.package.pricing).toHaveLength(1);
      expect(data.package.pricing[0].date).toBe(fridayDate.toISOString().split('T')[0]);
    });
  });

  describe('Admin Access', () => {
    it('should return inactive package details when includeInactive=true', async () => {
      const inactivePackage = await prisma.package.create({
        data: {
          name: 'Inactive Package',
          description: 'This package is no longer available',
          maxGuests: 6,
          isActive: false,
          defaultPrice: 300.00
        }
      });

      const request = createMockRequest(`http://localhost:3000/api/packages/${inactivePackage.id}?includeInactive=true`);
      const params = createMockParams(inactivePackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.package.id).toBe(inactivePackage.id);
      expect(data.package.isActive).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid ID format', async () => {
      const invalidId = 'not-a-valid-id';
      const request = createMockRequest(`http://localhost:3000/api/packages/${invalidId}`);
      const params = createMockParams(invalidId);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid package ID format');
    });

    it('should return 400 for empty ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/packages/');
      const params = createMockParams('');
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Package ID is required');
    });
  });

  describe('Response Format', () => {
    it('should include all base fields in response', async () => {
      const request = createMockRequest(`http://localhost:3000/api/packages/${testPackage.id}`);
      const params = createMockParams(testPackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('package');
      
      const pkg = data.package;
      expect(pkg).toHaveProperty('id');
      expect(pkg).toHaveProperty('name');
      expect(pkg).toHaveProperty('description');
      expect(pkg).toHaveProperty('maxGuests');
      expect(pkg).toHaveProperty('defaultPrice');
      expect(pkg).toHaveProperty('isActive');
      expect(pkg).toHaveProperty('createdAt');
      expect(pkg).toHaveProperty('updatedAt');
    });

    it('should sort availability and pricing by date ascending', async () => {
      const nextFriday = new Date(fridayDate);
      nextFriday.setDate(fridayDate.getDate() + 7);

      await prisma.packageAvailability.createMany({
        data: [
          {
            packageId: testPackage.id,
            date: nextFriday,
            isAvailable: true,
            availableQuantity: 4
          },
          {
            packageId: testPackage.id,
            date: fridayDate,
            isAvailable: true,
            availableQuantity: 3
          },
          {
            packageId: testPackage.id,
            date: saturdayDate,
            isAvailable: true,
            availableQuantity: 2
          }
        ]
      });

      const request = createMockRequest(`http://localhost:3000/api/packages/${testPackage.id}?includeAvailability=true`);
      const params = createMockParams(testPackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.package.availability).toHaveLength(3);
      expect(new Date(data.package.availability[0].date)).toEqual(fridayDate);
      expect(new Date(data.package.availability[1].date)).toEqual(saturdayDate);
      expect(new Date(data.package.availability[2].date)).toEqual(nextFriday);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      await prisma.$disconnect();
      
      const request = createMockRequest(`http://localhost:3000/api/packages/${testPackage.id}`);
      const params = createMockParams(testPackage.id);
      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch package');
      
      await prisma.$connect();
    });
  });
});