import { NextRequest } from 'next/server';

const mockGetServerSession = jest.fn();
const mockPrisma = {
  booking: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  bookingItem: {
    groupBy: jest.fn(),
  },
  package: {
    findMany: jest.fn(),
  },
};

jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('/api/admin/dashboard/stats', () => {
  let GET: any;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    // Dynamic import to avoid ES module issues
    const module = await import('../route');
    GET = module.GET;
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/stats');
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

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/stats');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. Admin role required.');
    });

    it('should return dashboard stats for admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      // Mock booking counts
      mockPrisma.booking.count
        .mockResolvedValueOnce(5) // today
        .mockResolvedValueOnce(12) // this week
        .mockResolvedValueOnce(45) // this month
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(2) // confirmed
        .mockResolvedValueOnce(0) // cancelled
        .mockResolvedValueOnce(0); // refunded

      // Mock revenue aggregation
      mockPrisma.booking.aggregate
        .mockResolvedValueOnce({ _sum: { finalAmount: 250.50 } }) // today
        .mockResolvedValueOnce({ _sum: { finalAmount: 1200.75 } }) // this week
        .mockResolvedValueOnce({ _sum: { finalAmount: 5500.25 } }); // this month

      // Mock package stats
      mockPrisma.bookingItem.groupBy.mockResolvedValue([
        {
          packageId: 'package1',
          _count: { packageId: 15 },
          _sum: { totalPrice: 1500.00 },
        },
        {
          packageId: 'package2',
          _count: { packageId: 8 },
          _sum: { totalPrice: 800.00 },
        },
      ]);

      mockPrisma.package.findMany.mockResolvedValue([
        { id: 'package1', name: 'VIP Package', description: 'VIP', inclusions: [], maxGuests: 8, defaultPrice: 100, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'package2', name: 'Standard Package', description: 'Standard', inclusions: [], maxGuests: 4, defaultPrice: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/stats');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        bookings: {
          today: 5,
          thisWeek: 12,
          thisMonth: 45,
          byStatus: {
            PENDING: 3,
            CONFIRMED: 2,
            CANCELLED: 0,
            REFUNDED: 0,
          },
        },
        revenue: {
          today: 250.50,
          thisWeek: 1200.75,
          thisMonth: 5500.25,
          currency: 'gbp',
        },
        packages: [
          {
            id: 'package1',
            name: 'VIP Package',
            bookingCount: 15,
            revenue: 1500.00,
            percentage: 65.22,
          },
          {
            id: 'package2',
            name: 'Standard Package',
            bookingCount: 8,
            revenue: 800.00,
            percentage: 34.78,
          },
        ],
      });
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.count.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/stats');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch dashboard stats');
    });

    it('should handle empty data correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      // Mock empty data
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { finalAmount: null } });
      mockPrisma.bookingItem.groupBy.mockResolvedValue([]);
      mockPrisma.package.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/dashboard/stats');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.bookings.today).toBe(0);
      expect(data.data.revenue.today).toBe(0);
      expect(data.data.packages).toEqual([]);
    });
  });
});