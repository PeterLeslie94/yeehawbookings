/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock NextRequest before importing routes
jest.mock('next/server', () => ({
  NextRequest: jest.fn((url: string) => ({
    url,
    nextUrl: new URL(url),
  })),
  NextResponse: {
    json: jest.fn((data: any, init?: ResponseInit) => ({
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}));

// Mock the Prisma client
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    extra: {
      findMany: jest.fn(),
    },
    extraAvailability: {
      findMany: jest.fn(),
    },
  },
}));

import { GET as getExtras } from '@/app/api/extras/route';
import { GET as getExtrasAvailability } from '@/app/api/extras/availability/route';
import { prisma } from '@/app/lib/prisma';

describe('Extras API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/extras', () => {
    it('should return all active extras', async () => {
      // Arrange
      const mockExtras = [
        {
          id: '1',
          name: 'Premium Champagne Bottle',
          description: 'Dom Perignon',
          price: 350.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'VIP Bottle Service',
          description: 'Grey Goose with mixers',
          price: 250.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.extra.findMany as jest.Mock).mockResolvedValue(mockExtras);

      // Act
      const request = new NextRequest('http://localhost:3000/api/extras');
      const response = await getExtras(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.extras).toHaveLength(2);
      expect(data.extras[0]).toMatchObject({
        id: '1',
        name: 'Premium Champagne Bottle',
        price: 350.00,
      });
      expect(prisma.extra.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no extras exist', async () => {
      // Arrange
      (prisma.extra.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const request = new NextRequest('http://localhost:3000/api/extras');
      const response = await getExtras(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.extras).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      (prisma.extra.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      // Act
      const request = new NextRequest('http://localhost:3000/api/extras');
      const response = await getExtras(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch extras');
    });
  });

  describe('GET /api/extras/availability', () => {
    it('should return extras with availability for specific date', async () => {
      // Arrange
      const testDate = '2024-12-20';
      const mockExtrasWithAvailability = [
        {
          id: '1',
          name: 'Premium Champagne Bottle',
          description: 'Dom Perignon',
          price: 350.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          availability: [{
            id: 'av1',
            extraId: '1',
            date: new Date(testDate),
            totalQuantity: 10,
            availableQuantity: 7,
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        },
        {
          id: '2',
          name: 'VIP Bottle Service',
          description: 'Grey Goose with mixers',
          price: 250.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          availability: [{
            id: 'av2',
            extraId: '2',
            date: new Date(testDate),
            totalQuantity: 5,
            availableQuantity: 0,
            isAvailable: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        },
      ];

      (prisma.extra.findMany as jest.Mock).mockResolvedValue(mockExtrasWithAvailability);

      // Act
      const request = new NextRequest(`http://localhost:3000/api/extras/availability?date=${testDate}`);
      const response = await getExtrasAvailability(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.extras).toHaveLength(2);
      expect(data.date).toBe(testDate);
      expect(data.timezone).toBe('Europe/London');
      expect(data.extras[0].availability).toBeDefined();
      expect(data.extras[0].availability.availableQuantity).toBe(7);
      expect(data.extras[1].availability.availableQuantity).toBe(0);
      expect(data.extras[1].availability.isAvailable).toBe(false);
    });

    it('should return 400 for missing date parameter', async () => {
      // Act
      const request = new NextRequest('http://localhost:3000/api/extras/availability');
      const response = await getExtrasAvailability(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Date parameter is required');
    });

    it('should return 400 for invalid date format', async () => {
      // Act
      const request = new NextRequest('http://localhost:3000/api/extras/availability?date=invalid-date');
      const response = await getExtrasAvailability(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid date format. Use YYYY-MM-DD');
    });

    it('should handle extras without availability records', async () => {
      // Arrange
      const testDate = '2024-12-20';
      const mockExtrasWithoutAvailability = [
        {
          id: '1',
          name: 'Premium Champagne Bottle',
          description: 'Dom Perignon',
          price: 350.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          availability: [],
        },
      ];

      (prisma.extra.findMany as jest.Mock).mockResolvedValue(mockExtrasWithoutAvailability);

      // Act
      const request = new NextRequest(`http://localhost:3000/api/extras/availability?date=${testDate}`);
      const response = await getExtrasAvailability(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.extras[0].availability).toEqual({
        availableQuantity: 0,
        isAvailable: false,
        totalQuantity: 0,
      });
    });

    it('should only return extras available on the specified date', async () => {
      // Arrange
      const testDate = '2024-12-20';
      const mockData = [
        {
          id: '1',
          name: 'Premium Champagne',
          price: 350.00,
          isActive: true,
          availability: [{
            date: new Date(testDate),
            availableQuantity: 5,
            isAvailable: true,
            totalQuantity: 10,
          }],
        },
      ];

      (prisma.extra.findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const request = new NextRequest(`http://localhost:3000/api/extras/availability?date=${testDate}`);
      const response = await getExtrasAvailability(request);

      // Assert
      expect(prisma.extra.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          availability: {
            where: {
              date: new Date(testDate),
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const testDate = '2024-12-20';
      (prisma.extra.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const request = new NextRequest(`http://localhost:3000/api/extras/availability?date=${testDate}`);
      const response = await getExtrasAvailability(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch extras availability');
    });
  });
});