import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { stripe } from '@/app/lib/stripe.server'
import { getUserSession } from '@/app/lib/auth/session.server'
import { generateBookingReference } from '@/app/lib/booking/reference'
import { addHours } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getUserSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { bookingId, paymentIntentId } = body

    // Validate required fields
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      )
    }

    // Validate booking ID format (should be cuid-like or reasonable format)
    if (typeof bookingId !== 'string' || 
        bookingId.trim().length === 0 || 
        bookingId.includes(' ') || 
        bookingId.length < 8 ||
        /^[a-z]+-[a-z]+$/.test(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID format' },
        { status: 400 }
      )
    }

    // Find booking with items and user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: {
          include: {
            package: true,
            extra: true
          }
        },
        user: true
      }
    })

    // Check if booking exists
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if booking belongs to authenticated user
    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if booking is in valid state for confirmation
    if (booking.status === 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Booking already confirmed' },
        { status: 409 }
      )
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot confirm cancelled booking' },
        { status: 409 }
      )
    }

    if (booking.status === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Cannot confirm refunded booking' },
        { status: 409 }
      )
    }

    // Validate booking has items
    if (!booking.items || booking.items.length === 0) {
      return NextResponse.json(
        { error: 'Booking has no items' },
        { status: 422 }
      )
    }

    // Validate payment intent with Stripe
    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (error: any) {
      if (error.message?.includes('No such payment_intent')) {
        return NextResponse.json(
          { error: 'Invalid payment intent' },
          { status: 422 }
        )
      }
      return NextResponse.json(
        { error: 'Payment validation failed' },
        { status: 500 }
      )
    }

    // Verify payment status
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 422 }
      )
    }

    // Verify payment amount matches booking total
    const expectedAmount = Math.round(booking.finalAmount * 100) // Convert to cents
    if (paymentIntent.amount !== expectedAmount) {
      return NextResponse.json(
        { error: 'Payment amount mismatch' },
        { status: 422 }
      )
    }

    // Perform all operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate booking reference if not set
      let bookingReference = booking.bookingReference
      if (!bookingReference || bookingReference === '') {
        bookingReference = generateBookingReference()
      }

      // Update booking
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          bookingReference,
          stripePaymentId: paymentIntentId,
        },
        include: {
          items: {
            include: {
              package: true,
              extra: true
            }
          },
          user: true
        }
      })

      // Update availability for each booking item
      for (const item of booking.items) {
        if (item.itemType === 'PACKAGE' && item.packageId) {
          await tx.packageAvailability.update({
            where: {
              packageId_date: {
                packageId: item.packageId,
                date: booking.bookingDate
              }
            },
            data: {
              availableQuantity: {
                decrement: item.quantity
              }
            }
          })
        } else if (item.itemType === 'EXTRA' && item.extraId) {
          await tx.extraAvailability.update({
            where: {
              extraId_date: {
                extraId: item.extraId,
                date: booking.bookingDate
              }
            },
            data: {
              availableQuantity: {
                decrement: item.quantity
              }
            }
          })
        }
      }

      // Create confirmation email queue entry
      const confirmationEmail = await tx.emailQueue.create({
        data: {
          recipient: booking.user!.email,
          subject: 'Booking Confirmation - Country Days',
          emailType: 'BOOKING_CONFIRMATION',
          content: {
            bookingReference: updatedBooking.bookingReference,
            bookingDate: booking.bookingDate.toISOString(),
            finalAmount: booking.finalAmount,
            items: booking.items.map(item => ({
              itemType: item.itemType,
              name: item.package?.name || item.extra?.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            }))
          },
          scheduledFor: new Date(), // Immediate delivery
          status: 'PENDING'
        }
      })

      // Create reminder email queue entry (24 hours before event)
      const reminderTime = addHours(booking.bookingDate, -24)
      const reminderEmail = await tx.emailQueue.create({
        data: {
          recipient: booking.user!.email,
          subject: 'Booking Reminder - Country Days',
          emailType: 'BOOKING_REMINDER',
          content: {
            bookingReference: updatedBooking.bookingReference,
            bookingDate: booking.bookingDate.toISOString(),
            finalAmount: booking.finalAmount,
            items: booking.items.map(item => ({
              itemType: item.itemType,
              name: item.package?.name || item.extra?.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            }))
          },
          scheduledFor: reminderTime,
          status: 'PENDING'
        }
      })

      return {
        booking: updatedBooking,
        confirmationEmail,
        reminderEmail
      }
    })

    // Return successful response
    return NextResponse.json({
      booking: result.booking,
      paymentConfirmation: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      },
      emailScheduled: {
        confirmationEmail: {
          scheduledFor: result.confirmationEmail.scheduledFor
        },
        reminderEmail: {
          scheduledFor: result.reminderEmail.scheduledFor
        }
      }
    })

  } catch (error: any) {
    console.error('Booking confirmation error:', error)

    // Handle specific error types
    if (error.message?.includes('Database error') || error.message?.includes('Connection lost')) {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (error.message?.includes('Email service') || error.message?.includes('Email scheduling failed') || error.message?.includes('Email service unavailable')) {
      return NextResponse.json(
        { error: 'Email scheduling failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}