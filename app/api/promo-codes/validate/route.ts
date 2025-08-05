import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { formatPromoCode, validatePromoCode, calculateDiscount } from '@/app/lib/booking/promo-codes';
import { PromoCodeValidateRequest } from '@/app/types/booking';

export async function POST(request: NextRequest) {
  try {
    let body: PromoCodeValidateRequest;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { code, subtotal, bookingDate } = body;

    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    if (subtotal === undefined || subtotal === null) {
      return NextResponse.json(
        { error: 'Subtotal is required' },
        { status: 400 }
      );
    }

    if (subtotal < 0) {
      return NextResponse.json(
        { error: 'Invalid subtotal' },
        { status: 400 }
      );
    }

    // Format and lookup promo code
    const formattedCode = formatPromoCode(code);
    
    const promoCode = await prisma.promoCode.findFirst({
      where: {
        code: formattedCode,
      },
    });

    // Validate promo code
    const validation = validatePromoCode(
      promoCode,
      subtotal,
      bookingDate ? new Date(bookingDate) : undefined
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Return successful validation response
    return NextResponse.json({
      valid: true,
      code: promoCode!.code,
      description: promoCode!.description,
      discountType: promoCode!.discountType,
      discountValue: promoCode!.discountValue,
      discountAmount: validation.discountAmount!,
    });

  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}