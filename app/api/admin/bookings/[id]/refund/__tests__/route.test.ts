import { NextRequest } from 'next/server';

const mockGetServerSession = jest.fn();
const mockPrisma = {
  booking: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockStripe = {
  refunds: {
    create: jest.fn(),
  },
  paymentIntents: {
    retrieve: jest.fn(),
  },
};

jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: mockPrisma,
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

describe('/api/admin/bookings/[id]/refund', () => {
  let POST: any;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../route');
    POST = module.POST;
  });

  const mockAdminSession = {
    user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    expires: '2024-12-31',
  };

  const mockBookingData = {
    id: 'booking1',
    bookingReference: 'REF001',
    status: 'CONFIRMED',
    finalAmount: 15000, // £150.00
    currency: 'gbp',
    stripePaymentIntentId: 'pi_test123',
    paidAt: new Date('2024-08-10'),
    refundedAt: null,
    refundAmount: null,
    items: [
      {
        id: 'item1',
        quantity: 1,
        totalPrice: 15000,
        package: { name: 'VIP Package' },
      }
    ],
  };

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 150.00, reason: 'Customer request' }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not an admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@test.com', role: 'CUSTOMER' },
        expires: '2024-12-31',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 150.00, reason: 'Customer request' }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. Admin role required.');
    });

    it('should process full refund successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      mockStripe.refunds.create.mockResolvedValue({
        id: 'rf_test123',
        amount: 15000,
        currency: 'gbp',
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000),
      });

      const updatedBooking = {
        ...mockBookingData,
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount: 15000,
      };
      mockPrisma.booking.update.mockResolvedValue(updatedBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ 
          amount: 150.00, 
          reason: 'Customer request',
          type: 'full'
        }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.status).toBe('REFUNDED');
      expect(data.data.refundAmount).toBe(15000);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: 15000,
        metadata: {
          booking_id: 'booking1',
          booking_reference: 'REF001',
          refund_reason: 'Customer request',
          refund_type: 'full',
          admin_id: 'admin1',
        },
      });

      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking1' },
        data: {
          status: 'REFUNDED',
          refundedAt: expect.any(Date),
          refundAmount: 15000,
        },
        include: expect.any(Object),
      });
    });

    it('should process partial refund successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      mockStripe.refunds.create.mockResolvedValue({
        id: 'rf_test123',
        amount: 7500, // £75.00
        currency: 'gbp',
        status: 'succeeded',
      });

      const updatedBooking = {
        ...mockBookingData,
        status: 'CONFIRMED', // Status remains confirmed for partial refunds
        refundedAt: new Date(),
        refundAmount: 7500,
      };
      mockPrisma.booking.update.mockResolvedValue(updatedBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ 
          amount: 75.00, 
          reason: 'Partial cancellation',
          type: 'partial'
        }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.status).toBe('CONFIRMED');
      expect(data.data.refundAmount).toBe(7500);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: 7500,
        metadata: {
          booking_id: 'booking1',
          booking_reference: 'REF001',
          refund_reason: 'Partial cancellation',
          refund_type: 'partial',
          admin_id: 'admin1',
        },
      });
    });

    it('should return 404 if booking not found', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/nonexistent/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 150.00, reason: 'Customer request' }),
      });
      const response = await POST(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Booking not found');
    });

    it('should return 400 if booking was not paid', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      const unpaidBooking = { ...mockBookingData, paidAt: null, stripePaymentIntentId: null };
      mockPrisma.booking.findUnique.mockResolvedValue(unpaidBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 150.00, reason: 'Customer request' }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Booking has no associated payment to refund');
    });

    it('should return 400 if booking is already fully refunded', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      const refundedBooking = { 
        ...mockBookingData, 
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount: 15000,
      };
      mockPrisma.booking.findUnique.mockResolvedValue(refundedBooking);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 150.00, reason: 'Customer request' }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Booking is already fully refunded');
    });

    it('should validate refund amount', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 200.00, reason: 'Customer request' }), // More than booking amount
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Refund amount cannot exceed the booking amount');
    });

    it('should validate refund amount is positive', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: -50.00, reason: 'Customer request' }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Refund amount must be positive');
    });

    it('should require refund reason', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 150.00 }), // Missing reason
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Refund reason is required');
    });

    it('should handle Stripe refund failures', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);

      mockStripe.refunds.create.mockRejectedValue({
        type: 'StripeCardError',
        message: 'Your card was declined.',
        code: 'card_declined',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 150.00, reason: 'Customer request' }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Stripe refund failed: Your card was declined.');
    });

    it('should handle database errors during refund update', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingData);
      
      mockStripe.refunds.create.mockResolvedValue({
        id: 'rf_test123',
        amount: 15000,
        currency: 'gbp',
        status: 'succeeded',
      });

      mockPrisma.booking.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 150.00, reason: 'Customer request' }),
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Refund processed but failed to update booking record');
    });

    it('should handle missing request body', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request body');
    });

    it('should handle invalid JSON in request body', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost:3000/api/admin/bookings/booking1/refund', {
        method: 'POST',
        body: 'invalid-json',
      });
      const response = await POST(request, { params: { id: 'booking1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request body');
    });
  });
});