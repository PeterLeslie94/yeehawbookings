import { NextRequest } from 'next/server';

const mockGetServerSession = jest.fn();
const mockPrisma = {
  booking: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('/api/admin/bookings', () => {
  let GET: any;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../route');
    GET = module.GET;
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings');
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

      const request = new NextRequest('http://localhost:3000/api/admin/bookings');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. Admin role required.');
    });

    it('should return paginated bookings with default parameters', async () => {
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
          bookingDate: new Date('2024-08-15'),
          status: 'CONFIRMED',
          finalAmount: 150.00,
          currency: 'gbp',
          createdAt: new Date('2024-08-10'),
          items: [{
            id: 'item1',
            quantity: 2,
            unitPrice: 75.00,
            totalPrice: 150.00,
            package: { name: 'VIP Package' },
            extra: null,
          }],
          user: { name: 'John Doe', email: 'john@example.com' },
        }
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.bookings).toEqual(mockBookings);
      expect(data.data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        include: {
          items: {
            include: {
              package: true,
              extra: true,
            }
          },
          user: {
            select: {
              name: true,
              email: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle pagination parameters correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.booking.count.mockResolvedValue(50);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings?page=3&limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.pagination).toEqual({
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 20, // (page - 1) * limit = (3-1) * 10
        take: 10,
      });
    });

    it('should filter bookings by search query', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.booking.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings?search=john');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { bookingReference: { contains: 'john', mode: 'insensitive' } },
            { guestName: { contains: 'john', mode: 'insensitive' } },
            { guestEmail: { contains: 'john', mode: 'insensitive' } },
            { user: { name: { contains: 'john', mode: 'insensitive' } } },
            { user: { email: { contains: 'john', mode: 'insensitive' } } },
          ],
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter bookings by status', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.booking.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings?status=CONFIRMED');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          status: 'CONFIRMED',
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter bookings by date range', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.booking.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings?startDate=2024-08-01&endDate=2024-08-31');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          bookingDate: {
            gte: new Date('2024-08-01'),
            lte: new Date('2024-08-31'),
          },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should combine multiple filters correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.booking.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings?search=john&status=CONFIRMED&startDate=2024-08-01');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { bookingReference: { contains: 'john', mode: 'insensitive' } },
            { guestName: { contains: 'john', mode: 'insensitive' } },
            { guestEmail: { contains: 'john', mode: 'insensitive' } },
            { user: { name: { contains: 'john', mode: 'insensitive' } } },
            { user: { email: { contains: 'john', mode: 'insensitive' } } },
          ],
          status: 'CONFIRMED',
          bookingDate: {
            gte: new Date('2024-08-01'),
          },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle sorting by different fields', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.booking.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings?sortBy=bookingDate&sortOrder=asc');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        include: expect.any(Object),
        orderBy: { bookingDate: 'asc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      mockPrisma.booking.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/bookings');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch bookings');
    });

    it('should validate pagination limits', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/bookings?limit=200');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Limit cannot exceed 100');
    });

    it('should validate sort fields', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
        expires: '2024-12-31',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/bookings?sortBy=invalidField');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid sort field');
    });
  });
});