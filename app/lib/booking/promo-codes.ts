import { DiscountType, PromoCode } from '@prisma/client';

export function calculateDiscount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number
): number {
  if (subtotal <= 0 || discountValue < 0) {
    return 0;
  }

  if (discountType === DiscountType.PERCENTAGE) {
    const discount = (subtotal * discountValue) / 100;
    return Math.round(discount * 100) / 100; // Round to 2 decimal places
  }

  // FIXED_AMOUNT
  return Math.min(discountValue, subtotal); // Cap at subtotal
}

export function checkUsageLimit(
  usageLimit: number | null,
  usageCount: number
): boolean {
  if (usageLimit === null) {
    return true; // No limit
  }
  return usageCount < usageLimit;
}

export function checkDateValidity(
  validFrom: Date | null,
  validUntil: Date | null,
  checkDate?: Date
): { isValid: boolean; reason?: string } {
  const now = checkDate || new Date();

  if (validFrom && now < validFrom) {
    return { isValid: false, reason: 'Promo code is not yet valid' };
  }

  if (validUntil && now > validUntil) {
    return { isValid: false, reason: 'Promo code has expired' };
  }

  return { isValid: true };
}

export function formatPromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isPromoCodeExpired(validUntil: Date | null): boolean {
  if (!validUntil) {
    return false;
  }
  return new Date() > validUntil;
}

export function isPromoCodeActive(promoCode: {
  isActive: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  usageLimit: number | null;
  usageCount: number;
}): boolean {
  if (!promoCode.isActive) {
    return false;
  }

  const { isValid } = checkDateValidity(promoCode.validFrom, promoCode.validUntil);
  if (!isValid) {
    return false;
  }

  return checkUsageLimit(promoCode.usageLimit, promoCode.usageCount);
}

export function validatePromoCode(
  promoCode: PromoCode | null,
  subtotal: number,
  bookingDate?: Date
): { isValid: boolean; error?: string; promoCode?: PromoCode; discountAmount?: number } {
  if (!promoCode) {
    return { isValid: false, error: 'Invalid promo code' };
  }

  if (!promoCode.isActive) {
    return { isValid: false, error: 'Promo code is not active' };
  }

  const dateValidity = checkDateValidity(promoCode.validFrom, promoCode.validUntil, bookingDate);
  if (!dateValidity.isValid) {
    return { isValid: false, error: dateValidity.reason };
  }

  if (!checkUsageLimit(promoCode.usageLimit, promoCode.usageCount)) {
    return { isValid: false, error: 'Promo code usage limit reached' };
  }

  const discountAmount = calculateDiscount(subtotal, promoCode.discountType, promoCode.discountValue);

  return {
    isValid: true,
    promoCode,
    discountAmount
  };
}