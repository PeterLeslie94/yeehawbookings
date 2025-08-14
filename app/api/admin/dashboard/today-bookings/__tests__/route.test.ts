import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { BookingStatus } from '@prisma/client';

jest.mock('next-auth');
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/dashboard/today-bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/today-bookings');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not an admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@test.com', role: 'CUSTOMER' },
        expires: '2024-12-31',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/today-bookings');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. Admin role required.');
    });

    it('should return today\'s bookings for admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      const mockBookings = [
        {
          id: 'booking1',
          bookingReference: 'REF001',
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          status: BookingStatus.CONFIRMED,
          finalAmount: 150.00,
          createdAt: new Date('2024-01-15T10:30:00Z'),
          user: null,
          items: [
            {
              id: 'item1',
              quantity: 2,
              package: {
                name: 'VIP Package',
              },
              extra: null,
            },
          ],
        },
        {
          id: 'booking2',
          bookingReference: 'REF002',
          guestName: null,
          guestEmail: null,
          status: BookingStatus.PENDING,
          finalAmount: 75.00,
          createdAt: new Date('2024-01-15T14:20:00Z'),
          user: {
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
          items: [
            {
              id: 'item2',
              quantity: 1,
              package: {
                name: 'Standard Package',
              },
              extra: null,
            },
            {
              id: 'item3',
              quantity: 1,
              package: null,
              extra: {
                name: 'Bottle Service',
              },
            },
          ],
        },
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/today-bookings');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      
      expect(data.data[0]).toEqual({
        id: 'booking1',
        bookingReference: 'REF001',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        status: BookingStatus.CONFIRMED,
        finalAmount: 150.00,
        bookingTime: '10:30',
        packages: [
          {
            name: 'VIP Package',
            quantity: 2,
          },
        ],
      });

      expect(data.data[1]).toEqual({
        id: 'booking2',
        bookingReference: 'REF002',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        status: BookingStatus.PENDING,
        finalAmount: 75.00,
        bookingTime: '14:20',
        packages: [
          {
            name: 'Standard Package',
            quantity: 1,
          },
          {
            name: 'Bottle Service',
            quantity: 1,
          },
        ],
      });
    });

    it('should handle empty results', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/today-bookings');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should query for today\'s bookings with correct date range', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/today-bookings');
      await GET(request);

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          bookingDate: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              package: {
                select: {
                  name: true,
                },
              },
              extra: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/today-bookings');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch today\'s bookings');
    });
  });
});