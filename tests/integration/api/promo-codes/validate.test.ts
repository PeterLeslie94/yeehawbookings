import { POST } from '@/app/api/promo-codes/validate/route';
import { prisma } from '@/app/lib/prisma';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    promoCode: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('POST /api/promo-codes/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/promo-codes/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  describe('Valid Promo Codes', () => {
    it('should validate and return percentage discount promo code', async () => {
      const mockPromoCode = {
        id: '1',
        code: 'SAVE20',
        description: '20% off',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        usageLimit: 100,
        usageCount: 10,
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'SAVE20',
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        valid: true,
        code: 'SAVE20',
        description: '20% off',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        discountAmount: 20,
      });
    });

    it('should validate and return fixed amount discount promo code', async () => {
      const mockPromoCode = {
        id: '2',
        code: 'FIXED25',
        description: '£25 off',
        discountType: 'FIXED_AMOUNT',
        discountValue: 25,
        validFrom: new Date('2024-01-01'),
        validUntil: null,
        usageLimit: null,
        usageCount: 5,
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'FIXED25',
        subtotal: 150,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        valid: true,
        code: 'FIXED25',
        description: '£25 off',
        discountType: 'FIXED_AMOUNT',
        discountValue: 25,
        discountAmount: 25,
      });
    });

    it('should cap fixed discount at subtotal amount', async () => {
      const mockPromoCode = {
        id: '3',
        code: 'FIXED50',
        description: '£50 off',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50,
        validFrom: new Date('2024-01-01'),
        validUntil: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'FIXED50',
        subtotal: 30,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.discountAmount).toBe(30); // Capped at subtotal
    });
  });

  describe('Invalid Promo Codes', () => {
    it('should return error for non-existent promo code', async () => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(null);

      const request = createRequest({
        code: 'INVALID',
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid promo code',
      });
    });

    it('should return error for inactive promo code', async () => {
      const mockPromoCode = {
        id: '4',
        code: 'INACTIVE',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        isActive: false,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'INACTIVE',
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Promo code is not active',
      });
    });

    it('should return error for expired promo code', async () => {
      const mockPromoCode = {
        id: '5',
        code: 'EXPIRED',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2023-12-31'),
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'EXPIRED',
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Promo code has expired',
      });
    });

    it('should return error for promo code not yet valid', async () => {
      const mockPromoCode = {
        id: '6',
        code: 'FUTURE',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: new Date('2025-01-01'),
        validUntil: null,
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'FUTURE',
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Promo code is not yet valid',
      });
    });

    it('should return error for promo code exceeding usage limit', async () => {
      const mockPromoCode = {
        id: '7',
        code: 'MAXED',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: new Date('2024-01-01'),
        validUntil: null,
        usageLimit: 50,
        usageCount: 50,
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'MAXED',
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Promo code usage limit reached',
      });
    });
  });

  describe('Request Validation', () => {
    it('should return error for missing code', async () => {
      const request = createRequest({
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Promo code is required',
      });
    });

    it('should return error for missing subtotal', async () => {
      const request = createRequest({
        code: 'SAVE10',
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Subtotal is required',
      });
    });

    it('should return error for invalid subtotal', async () => {
      const request = createRequest({
        code: 'SAVE10',
        subtotal: -50,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid subtotal',
      });
    });

    it('should handle case-insensitive promo codes', async () => {
      const mockPromoCode = {
        id: '8',
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: new Date('2024-01-01'),
        validUntil: null,
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'save10', // lowercase
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.promoCode.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'SAVE10', // Should be uppercase
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in promo codes', async () => {
      const mockPromoCode = {
        id: '9',
        code: 'TRIM20',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        validFrom: new Date('2024-01-01'),
        validUntil: null,
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: '  TRIM20  ', // with spaces
        subtotal: 100,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.promoCode.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'TRIM20', // Should be trimmed
        },
      });
    });

    it('should handle very large discount percentages correctly', async () => {
      const mockPromoCode = {
        id: '10',
        code: 'MEGA100',
        discountType: 'PERCENTAGE',
        discountValue: 100,
        validFrom: new Date('2024-01-01'),
        validUntil: null,
        isActive: true,
      };

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(mockPromoCode);

      const request = createRequest({
        code: 'MEGA100',
        subtotal: 200,
        bookingDate: '2024-06-15',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.discountAmount).toBe(200); // 100% of subtotal
    });

    it('should return error for invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/promo-codes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid request',
      });
    });
  });
});