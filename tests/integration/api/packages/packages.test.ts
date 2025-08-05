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
const { GET } = require('@/app/api/packages/route');
const { NextRequest } = require('next/server');

// Helper to create mock requests
function createMockRequest(url: string): any {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/packages', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.bookingItem.deleteMany();
    await prisma.packageAvailability.deleteMany();
    await prisma.packagePricing.deleteMany();
    await prisma.package.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Basic Functionality', () => {
    it('should return all active packages', async () => {
      // Create test packages
      const vipPackage = await prisma.package.create({
        data: {
          name: 'VIP Booth',
          description: 'Premium VIP booth with bottle service',
          maxGuests: 8,
          isActive: true
        }
      });

      const tablePackage = await prisma.package.create({
        data: {
          name: 'Reserved Table',
          description: 'Reserved table for your group',
          maxGuests: 4,
          isActive: true
        }
      });

      const inactivePackage = await prisma.package.create({
        data: {
          name: 'Old Package',
          description: 'Discontinued package',
          maxGuests: 6,
          isActive: false
        }
      });

      const request = createMockRequest('http://localhost:3000/api/packages');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.packages).toHaveLength(2);
      expect(data.packages.map((p: any) => p.id)).toContain(vipPackage.id);
      expect(data.packages.map((p: any) => p.id)).toContain(tablePackage.id);
      expect(data.packages.map((p: any) => p.id)).not.toContain(inactivePackage.id);
    });

    it('should return empty array when no active packages exist', async () => {
      const request = createMockRequest('http://localhost:3000/api/packages');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.packages).toEqual([]);
    });
  });

  describe('Response Format', () => {
    it('should return packages with all required fields', async () => {
      await prisma.package.create({
        data: {
          name: 'VIP Booth',
          description: 'Premium VIP booth with bottle service',
          maxGuests: 8,
          isActive: true
        }
      });

      const request = createMockRequest('http://localhost:3000/api/packages');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.packages).toHaveLength(1);
      
      const pkg = data.packages[0];
      expect(pkg).toHaveProperty('id');
      expect(pkg).toHaveProperty('name');
      expect(pkg).toHaveProperty('description');
      expect(pkg).toHaveProperty('maxGuests');
      expect(pkg).toHaveProperty('isActive');
      expect(pkg).toHaveProperty('createdAt');
      expect(pkg).toHaveProperty('updatedAt');
    });

    it('should order packages by name ascending', async () => {
      await prisma.package.create({
        data: {
          name: 'Z Package',
          description: 'Last alphabetically',
          maxGuests: 4,
          isActive: true
        }
      });

      await prisma.package.create({
        data: {
          name: 'A Package',
          description: 'First alphabetically',
          maxGuests: 4,
          isActive: true
        }
      });

      await prisma.package.create({
        data: {
          name: 'M Package',
          description: 'Middle alphabetically',
          maxGuests: 4,
          isActive: true
        }
      });

      const request = createMockRequest('http://localhost:3000/api/packages');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.packages).toHaveLength(3);
      expect(data.packages[0].name).toBe('A Package');
      expect(data.packages[1].name).toBe('M Package');
      expect(data.packages[2].name).toBe('Z Package');
    });
  });

  describe('Query Parameters', () => {
    it('should filter by maxGuests when provided', async () => {
      await prisma.package.create({
        data: {
          name: 'Small Table',
          description: 'For small groups',
          maxGuests: 4,
          isActive: true
        }
      });

      await prisma.package.create({
        data: {
          name: 'Large Booth',
          description: 'For large groups',
          maxGuests: 10,
          isActive: true
        }
      });

      const request = createMockRequest('http://localhost:3000/api/packages?minGuests=6');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.packages).toHaveLength(1);
      expect(data.packages[0].name).toBe('Large Booth');
    });

    it('should include default pricing if includeDefaultPricing=true', async () => {
      const pkg = await prisma.package.create({
        data: {
          name: 'VIP Booth',
          description: 'Premium booth',
          maxGuests: 8,
          isActive: true,
          defaultPrice: 500.00
        }
      });

      const request = createMockRequest('http://localhost:3000/api/packages?includeDefaultPricing=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.packages).toHaveLength(1);
      expect(data.packages[0].defaultPrice).toBe(500.00);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Force disconnect to simulate database error
      await prisma.$disconnect();
      
      const request = createMockRequest('http://localhost:3000/api/packages');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch packages');
      
      // Reconnect for cleanup
      await prisma.$connect();
    });

    it('should handle invalid query parameters', async () => {
      const request = createMockRequest('http://localhost:3000/api/packages?minGuests=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });
  });

  describe('Performance', () => {
    it('should handle large number of packages efficiently', async () => {
      // Create 50 packages
      const packages = [];
      for (let i = 0; i < 50; i++) {
        packages.push({
          name: `Package ${i.toString().padStart(2, '0')}`,
          description: `Description for package ${i}`,
          maxGuests: 4 + (i % 6),
          isActive: true
        });
      }
      
      await prisma.package.createMany({
        data: packages
      });

      const start = Date.now();
      const request = createMockRequest('http://localhost:3000/api/packages');
      const response = await GET(request);
      const duration = Date.now() - start;

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.packages).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});