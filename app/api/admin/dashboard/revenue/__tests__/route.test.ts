import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';

jest.mock('next-auth');
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/dashboard/revenue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue');
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

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. Admin role required.');
    });

    it('should return revenue chart data with default period (daily)', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      const mockDailyData = [
        { bookingDate: new Date('2024-01-10'), _sum: { finalAmount: 150.00 } },
        { bookingDate: new Date('2024-01-11'), _sum: { finalAmount: 275.50 } },
        { bookingDate: new Date('2024-01-12'), _sum: { finalAmount: 400.25 } },
        { bookingDate: new Date('2024-01-13'), _sum: { finalAmount: 125.75 } },
        { bookingDate: new Date('2024-01-14'), _sum: { finalAmount: 350.00 } },
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockDailyData);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.daily).toHaveLength(5);
      expect(data.data.daily[0]).toEqual({
        label: '10 Jan',
        value: 150.00,
        date: '2024-01-10',
      });
      expect(data.data.daily[4]).toEqual({
        label: '14 Jan',
        value: 350.00,
        date: '2024-01-14',
      });
    });

    it('should return weekly revenue data when period is weekly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      const mockWeeklyData = [
        { bookingDate: new Date('2024-01-01'), _sum: { finalAmount: 1200.00 } },
        { bookingDate: new Date('2024-01-08'), _sum: { finalAmount: 850.50 } },
        { bookingDate: new Date('2024-01-15'), _sum: { finalAmount: 950.75 } },
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockWeeklyData);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue?period=weekly');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.weekly).toHaveLength(3);
      expect(data.data.weekly[0]).toEqual({
        label: 'Week 1 Jan',
        value: 1200.00,
        date: '2024-01-01',
      });
    });

    it('should return monthly revenue data when period is monthly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      const mockMonthlyData = [
        { bookingDate: new Date('2024-01-01'), _sum: { finalAmount: 3500.00 } },
        { bookingDate: new Date('2024-02-01'), _sum: { finalAmount: 2800.50 } },
        { bookingDate: new Date('2024-03-01'), _sum: { finalAmount: 4200.75 } },
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockMonthlyData);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue?period=monthly');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.monthly).toHaveLength(3);
      expect(data.data.monthly[0]).toEqual({
        label: 'January 2024',
        value: 3500.00,
        date: '2024-01-01',
      });
    });

    it('should handle invalid period parameter', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue?period=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid period. Must be daily, weekly, or monthly');
    });

    it('should handle empty data correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.daily).toEqual([]);
    });

    it('should query with correct date range and grouping for daily', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue?period=daily');
      await GET(request);

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          status: 'CONFIRMED',
          bookingDate: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        select: {
          bookingDate: true,
          finalAmount: true,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch revenue data');
    });

    it('should handle null revenue values correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      const mockDataWithNull = [
        { bookingDate: new Date('2024-01-10'), _sum: { finalAmount: 150.00 } },
        { bookingDate: new Date('2024-01-11'), _sum: { finalAmount: null } },
        { bookingDate: new Date('2024-01-12'), _sum: { finalAmount: 275.50 } },
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockDataWithNull);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/revenue');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.daily[0].value).toBe(150.00);
      expect(data.data.daily[1].value).toBe(0);
      expect(data.data.daily[2].value).toBe(275.50);
    });
  });
});