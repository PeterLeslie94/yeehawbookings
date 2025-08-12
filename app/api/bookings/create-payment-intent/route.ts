import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/app/lib/stripe.server'
import { db } from '@/app/lib/db.server'
import { getUserSession } from '@/app/lib/auth/session.server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getUserSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Fetch booking
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        packages: true,
        extras: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check ownership
    if (booking.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If payment intent already exists, retrieve it
    if (booking.stripePaymentIntentId) {
      const existingIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId)
      return NextResponse.json({
        clientSecret: existingIntent.client_secret,
        amount: existingIntent.amount,
        currency: existingIntent.currency,
      })
    }

    // Calculate final amount with discount applied
    const amount = booking.discountAmount ? booking.totalAmount - booking.discountAmount : booking.totalAmount
    const currency = booking.currency || 'usd'

    // Create payment intent metadata
    const metadata: Record<string, string> = {
      bookingId: booking.id,
      userId: booking.userId,
    }

    if (booking.promoCode) {
      metadata.promoCode = booking.promoCode
      metadata.discountAmount = String(booking.discountAmount || 0)
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
    })

    // Update booking with payment intent ID
    await db.booking.update({
      where: { id: bookingId },
      data: { stripePaymentIntentId: paymentIntent.id },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}