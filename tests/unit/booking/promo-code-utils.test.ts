import {
  validatePromoCode,
  calculateDiscount,
  checkUsageLimit,
  checkDateValidity,
  formatPromoCode,
  isPromoCodeExpired,
  isPromoCodeActive
} from '@/app/lib/booking/promo-codes';
import { DiscountType } from '@prisma/client';

describe('Promo Code Utilities', () => {
  describe('calculateDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      const result = calculateDiscount(100, DiscountType.PERCENTAGE, 20);
      expect(result).toBe(20);
    });

    it('should calculate fixed amount discount correctly', () => {
      const result = calculateDiscount(100, DiscountType.FIXED_AMOUNT, 25);
      expect(result).toBe(25);
    });

    it('should cap fixed discount at subtotal', () => {
      const result = calculateDiscount(20, DiscountType.FIXED_AMOUNT, 50);
      expect(result).toBe(20);
    });

    it('should handle 100% discount', () => {
      const result = calculateDiscount(150, DiscountType.PERCENTAGE, 100);
      expect(result).toBe(150);
    });

    it('should handle 0% discount', () => {
      const result = calculateDiscount(100, DiscountType.PERCENTAGE, 0);
      expect(result).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const result = calculateDiscount(99.99, DiscountType.PERCENTAGE, 33.33);
      expect(result).toBe(33.33);
    });

    it('should handle negative subtotal by returning 0', () => {
      const result = calculateDiscount(-100, DiscountType.PERCENTAGE, 20);
      expect(result).toBe(0);
    });

    it('should handle negative discount value by returning 0', () => {
      const result = calculateDiscount(100, DiscountType.PERCENTAGE, -20);
      expect(result).toBe(0);
    });
  });

  describe('checkUsageLimit', () => {
    it('should return true when no usage limit is set', () => {
      const result = checkUsageLimit(null, 100);
      expect(result).toBe(true);
    });

    it('should return true when usage is below limit', () => {
      const result = checkUsageLimit(100, 50);
      expect(result).toBe(true);
    });

    it('should return false when usage equals limit', () => {
      const result = checkUsageLimit(100, 100);
      expect(result).toBe(false);
    });

    it('should return false when usage exceeds limit', () => {
      const result = checkUsageLimit(50, 75);
      expect(result).toBe(false);
    });

    it('should handle zero usage limit', () => {
      const result = checkUsageLimit(0, 0);
      expect(result).toBe(false);
    });
  });

  describe('checkDateValidity', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return valid when no date restrictions', () => {
      const result = checkDateValidity(null, null);
      expect(result).toEqual({ isValid: true });
    });

    it('should return valid when within date range', () => {
      const validFrom = new Date('2024-01-01');
      const validUntil = new Date('2024-12-31');
      const result = checkDateValidity(validFrom, validUntil);
      expect(result).toEqual({ isValid: true });
    });

    it('should return invalid when before valid from date', () => {
      const validFrom = new Date('2024-07-01');
      const result = checkDateValidity(validFrom, null);
      expect(result).toEqual({ 
        isValid: false, 
        reason: 'Promo code is not yet valid' 
      });
    });

    it('should return invalid when after valid until date', () => {
      const validUntil = new Date('2024-05-31');
      const result = checkDateValidity(null, validUntil);
      expect(result).toEqual({ 
        isValid: false, 
        reason: 'Promo code has expired' 
      });
    });

    it('should handle same day validity', () => {
      const validFrom = new Date('2024-06-15T00:00:00Z');
      const validUntil = new Date('2024-06-15T23:59:59Z');
      const result = checkDateValidity(validFrom, validUntil);
      expect(result).toEqual({ isValid: true });
    });

    it('should check against booking date when provided', () => {
      const validFrom = new Date('2024-01-01');
      const validUntil = new Date('2024-12-31');
      const bookingDate = new Date('2025-01-15');
      const result = checkDateValidity(validFrom, validUntil, bookingDate);
      expect(result).toEqual({ 
        isValid: false, 
        reason: 'Promo code has expired' 
      });
    });
  });

  describe('formatPromoCode', () => {
    it('should convert to uppercase', () => {
      expect(formatPromoCode('save20')).toBe('SAVE20');
    });

    it('should trim whitespace', () => {
      expect(formatPromoCode('  SAVE20  ')).toBe('SAVE20');
    });

    it('should handle mixed case and spaces', () => {
      expect(formatPromoCode('  SaVe20  ')).toBe('SAVE20');
    });

    it('should handle empty string', () => {
      expect(formatPromoCode('')).toBe('');
    });

    it('should handle special characters', () => {
      expect(formatPromoCode('SAVE-20%')).toBe('SAVE-20%');
    });
  });

  describe('isPromoCodeExpired', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false when no expiry date', () => {
      expect(isPromoCodeExpired(null)).toBe(false);
    });

    it('should return false when expiry is in future', () => {
      const futureDate = new Date('2024-12-31');
      expect(isPromoCodeExpired(futureDate)).toBe(false);
    });

    it('should return true when expiry is in past', () => {
      const pastDate = new Date('2024-01-01');
      expect(isPromoCodeExpired(pastDate)).toBe(true);
    });

    it('should return false when expiry is today', () => {
      const today = new Date('2024-06-15T23:59:59Z');
      expect(isPromoCodeExpired(today)).toBe(false);
    });
  });

  describe('isPromoCodeActive', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false when not active flag', () => {
      const promoCode = {
        isActive: false,
        validFrom: null,
        validUntil: null,
        usageLimit: null,
        usageCount: 0
      };
      expect(isPromoCodeActive(promoCode)).toBe(false);
    });

    it('should return false when expired', () => {
      const promoCode = {
        isActive: true,
        validFrom: null,
        validUntil: new Date('2024-01-01'),
        usageLimit: null,
        usageCount: 0
      };
      expect(isPromoCodeActive(promoCode)).toBe(false);
    });

    it('should return false when not yet valid', () => {
      const promoCode = {
        isActive: true,
        validFrom: new Date('2024-12-01'),
        validUntil: null,
        usageLimit: null,
        usageCount: 0
      };
      expect(isPromoCodeActive(promoCode)).toBe(false);
    });

    it('should return false when usage limit reached', () => {
      const promoCode = {
        isActive: true,
        validFrom: null,
        validUntil: null,
        usageLimit: 10,
        usageCount: 10
      };
      expect(isPromoCodeActive(promoCode)).toBe(false);
    });

    it('should return true when all conditions are met', () => {
      const promoCode = {
        isActive: true,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        usageLimit: 100,
        usageCount: 50
      };
      expect(isPromoCodeActive(promoCode)).toBe(true);
    });
  });

  describe('validatePromoCode', () => {
    const validPromoCode = {
      id: '1',
      code: 'SAVE20',
      description: '20% off',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
      usageLimit: 100,
      usageCount: 50,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const now = new Date('2024-06-15T12:00:00Z');
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return valid result for active promo code', () => {
      const result = validatePromoCode(validPromoCode, 100);
      expect(result).toEqual({
        isValid: true,
        promoCode: validPromoCode,
        discountAmount: 20
      });
    });

    it('should return error for null promo code', () => {
      const result = validatePromoCode(null, 100);
      expect(result).toEqual({
        isValid: false,
        error: 'Invalid promo code'
      });
    });

    it('should return error for inactive promo code', () => {
      const inactiveCode = { ...validPromoCode, isActive: false };
      const result = validatePromoCode(inactiveCode, 100);
      expect(result).toEqual({
        isValid: false,
        error: 'Promo code is not active'
      });
    });

    it('should return error for expired promo code', () => {
      const expiredCode = { 
        ...validPromoCode, 
        validUntil: new Date('2024-01-01') 
      };
      const result = validatePromoCode(expiredCode, 100);
      expect(result).toEqual({
        isValid: false,
        error: 'Promo code has expired'
      });
    });

    it('should return error for future promo code', () => {
      const futureCode = { 
        ...validPromoCode, 
        validFrom: new Date('2024-12-01') 
      };
      const result = validatePromoCode(futureCode, 100);
      expect(result).toEqual({
        isValid: false,
        error: 'Promo code is not yet valid'
      });
    });

    it('should return error for exceeded usage limit', () => {
      const maxedCode = { 
        ...validPromoCode, 
        usageLimit: 50,
        usageCount: 50 
      };
      const result = validatePromoCode(maxedCode, 100);
      expect(result).toEqual({
        isValid: false,
        error: 'Promo code usage limit reached'
      });
    });

    it('should validate against booking date when provided', () => {
      const bookingDate = new Date('2025-01-15');
      const result = validatePromoCode(validPromoCode, 100, bookingDate);
      expect(result).toEqual({
        isValid: false,
        error: 'Promo code has expired'
      });
    });

    it('should handle fixed amount discount', () => {
      const fixedCode = { 
        ...validPromoCode, 
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 25 
      };
      const result = validatePromoCode(fixedCode, 100);
      expect(result).toEqual({
        isValid: true,
        promoCode: fixedCode,
        discountAmount: 25
      });
    });
  });
});