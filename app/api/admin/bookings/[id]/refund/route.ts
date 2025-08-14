import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// POST - Process refund
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { amount, reason, type = 'full' } = body;

    // Validate required fields
    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Refund reason is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Refund amount must be positive' },
        { status: 400 }
      );
    }

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking has associated payment
    if (!booking.stripePaymentIntentId || !booking.paidAt) {
      return NextResponse.json(
        { error: 'Booking has no associated payment to refund' },
        { status: 400 }
      );
    }

    // Check if already fully refunded
    if (booking.status === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Booking is already fully refunded' },
        { status: 400 }
      );
    }

    // Validate refund amount (convert cents to dollars for comparison)
    const maxRefundAmount = booking.finalAmount / 100;
    if (amount > maxRefundAmount) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed the booking amount' },
        { status: 400 }
      );
    }

    // Convert to cents for Stripe
    const refundAmountCents = Math.round(amount * 100);

    try {
      // Process refund with Stripe
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
        amount: refundAmountCents,
        metadata: {
          booking_id: booking.id,
          booking_reference: booking.bookingReference,
          refund_reason: reason,
          refund_type: type,
          admin_id: session.user.id!,
        },
      });

      // Update booking in database
      const updateData: any = {
        refundedAt: new Date(),
        refundAmount: refundAmountCents,
      };

      // Set status to REFUNDED for full refunds
      if (type === 'full' || amount >= booking.finalAmount) {
        updateData.status = 'REFUNDED';
      }

      try {
        const updatedBooking = await prisma.booking.update({
          where: { id: params.id },
          data: updateData,
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

        return NextResponse.json({
          success: true,
          data: updatedBooking,
          refund: {
            id: refund.id,
            amount: refund.amount,
            status: refund.status,
          },
        });

      } catch (dbError: any) {
        console.error('Database update error after refund:', dbError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Refund processed but failed to update booking record' 
          },
          { status: 500 }
        );
      }

    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError);
      
      // Handle specific Stripe errors
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json(
          { error: `Stripe refund failed: ${stripeError.message}` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to process refund with payment provider' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process refund. Please try again.' },
      { status: 500 }
    );
  }
}