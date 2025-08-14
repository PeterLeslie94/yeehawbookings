import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/app/lib/stripe.server'
import { prisma } from '@/app/lib/prisma'
import { getUserSession } from '@/app/lib/auth/session.server'

export async function POST(request: NextRequest) {
  try {
    // Get user session (optional for guest checkout)
    const session = await getUserSession()

    // Get request body
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        promoCode: true,
        items: {
          include: {
            package: true,
            extra: true,
          }
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Validate booking access
    if (booking.userId) {
      // For authenticated bookings, check ownership
      if (!session?.user?.id || booking.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // For guest bookings, validate required fields
      if (!booking.guestEmail || !booking.guestName) {
        return NextResponse.json({ 
          error: 'Guest booking requires email and name' 
        }, { status: 400 })
      }
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
    const amount = booking.finalAmount
    const currency = booking.currency || 'gbp'

    // Create payment intent metadata
    const metadata: Record<string, string> = {
      bookingId: booking.id,
    }

    // Add user information to metadata
    if (booking.userId) {
      metadata.userId = booking.userId
    } else {
      // Guest booking metadata
      metadata.guestEmail = booking.guestEmail!
      metadata.guestName = booking.guestName!
    }

    if (booking.promoCode) {
      metadata.promoCode = booking.promoCode.code
      metadata.discountAmount = String(booking.discountAmount || 0)
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
    })

    // Update booking with payment intent ID
    await prisma.booking.update({
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