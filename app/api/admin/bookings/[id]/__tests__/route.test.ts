import { NextRequest } from 'next/server';

const mockGetServerSession = jest.fn();
const mockPrisma = {
  booking: {
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

describe('/api/admin/bookings/[id]', () => {
  let GET: any;
  let PUT: any;
  let DELETE: any;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../route');
    GET = module.GET;
    PUT = module.PUT;
    DELETE = module.DELETE;
  });

  const mockAdminSession = {
    user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    expires: '2024-12-31',
  };

  const mockBookingData = {
    id: 'booking1',
    bookingReference: 'REF001',
    userId: 'user1',
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    bookingDate: new Date('2024-08-15'),
    status: 'CONFIRMED',
    totalAmount: 150.00,
    discountAmount: 0,
    finalAmount: 150.00,
    currency: 'gbp',
    customerNotes: 'Birthday celebration',
    stripePaymentId: 'pi_test123',
    paidAt: new Date('2024-08-10'),
    createdAt: new Date('2024-08-10'),
    items: [
      {
        id: 'item1',
        itemType: 'PACKAGE',
        quantity: 1,
        unitPrice: 150.00,
        totalPrice: 150.00,
        package: {
          id: 'pkg1',
          name: 'VIP Package',
          description: 'Premium experience',
        },
        extra: null,
      }
    ],
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    promoCode: null,
  };

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1');
      const response = await GET(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not an admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@test.com', role: 'CUSTOMER' },
        expires: '2024-12-31',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1');
      const response = await GET(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. Admin role required.');
    });

    it('should return booking details for valid ID', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1');
      const response = await GET(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockBookingData);

      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking1' },
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
          promoCode: true,
        },
      });
    });

    it('should return 404 if booking not found', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/nonexistent');
      const response = await GET(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Booking not found');
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1');
      const response = await GET(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch booking details');
    });
  });

  describe('PUT', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const response = await PUT(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not an admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@test.com', role: 'CUSTOMER' },
        expires: '2024-12-31',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const response = await PUT(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. Admin role required.');
    });

    it('should update booking status successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);
      
      const updatedBooking = { ...mockBookingData, status: 'CANCELLED' };
      mockPrisma.booking.update.mockResolvedValue(updatedBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const response = await PUT(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.status).toBe('CANCELLED');

      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking1' },
        data: { status: 'CANCELLED' },
        include: expect.any(Object),
      });
    });

    it('should update customer notes successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);
      
      const updatedBooking = { ...mockBookingData, customerNotes: 'Updated notes' };
      mockPrisma.booking.update.mockResolvedValue(updatedBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'PUT',
        body: JSON.stringify({ customerNotes: 'Updated notes' }),
      });
      const response = await PUT(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.customerNotes).toBe('Updated notes');
    });

    it('should update guest information successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);
      
      const updatedBooking = { 
        ...mockBookingData, 
        guestName: 'Jane Doe',
        guestEmail: 'jane@example.com'
      };
      mockPrisma.booking.update.mockResolvedValue(updatedBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'PUT',
        body: JSON.stringify({ 
          guestName: 'Jane Doe',
          guestEmail: 'jane@example.com'
        }),
      });
      const response = await PUT(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.guestName).toBe('Jane Doe');
      expect(data.data.guestEmail).toBe('jane@example.com');
    });

    it('should return 404 if booking not found', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const response = await PUT(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Booking not found');
    });

    it('should validate status values', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });
      const response = await PUT(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid status value');
    });

    it('should validate email format', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'PUT',
        body: JSON.stringify({ guestEmail: 'invalid-email' }),
      });
      const response = await PUT(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid email format');
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);
      mockPrisma.booking.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const response = await PUT(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update booking');
    });
  });

  describe('DELETE', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not an admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@test.com', role: 'CUSTOMER' },
        expires: '2024-12-31',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. Admin role required.');
    });

    it('should cancel booking successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);
      
      const cancelledBooking = { ...mockBookingData, status: 'CANCELLED' };
      mockPrisma.booking.update.mockResolvedValue(cancelledBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.status).toBe('CANCELLED');

      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking1' },
        data: { status: 'CANCELLED' },
        include: expect.any(Object),
      });
    });

    it('should return 404 if booking not found', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Booking not found');
    });

    it('should return 400 if booking is already cancelled', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      const cancelledBooking = { ...mockBookingData, status: 'CANCELLED' };
      mockPrisma.booking.findUnique.mockResolvedValue(cancelledBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Booking is already cancelled');
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);
      mockPrisma.booking.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to cancel booking');
    });
  });
});