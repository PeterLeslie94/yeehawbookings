import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/app/lib/stripe.server'
import { prisma } from '@/app/lib/prisma'
import { BookingStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 400 }
    )
  }

  let event: any

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const bookingId = paymentIntent.metadata?.bookingId

        if (!bookingId) {
          return NextResponse.json(
            { error: 'Missing booking ID in payment intent metadata' },
            { status: 400 }
          )
        }

        // Find booking by payment intent ID for security
        const booking = await prisma.booking.findFirst({
          where: {
            stripePaymentIntentId: paymentIntent.id
          }
        })

        if (!booking) {
          return NextResponse.json(
            { error: 'Booking not found' },
            { status: 404 }
          )
        }

        // Only update if not already confirmed
        if (booking.status !== BookingStatus.CONFIRMED) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.CONFIRMED,
              stripePaymentStatus: 'succeeded',
              paidAt: new Date(),
            },
          })
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const bookingId = paymentIntent.metadata?.bookingId
        const errorMessage = paymentIntent.last_payment_error?.message

        if (bookingId) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              stripePaymentStatus: 'failed',
              paymentError: errorMessage || 'Payment failed',
            },
          })
        }
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object
        const bookingId = paymentIntent.metadata?.bookingId

        if (bookingId) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: BookingStatus.CANCELLED,
              stripePaymentStatus: 'canceled',
            },
          })
        }
        break
      }

      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object
        const bookingId = paymentIntent.metadata?.bookingId

        if (bookingId) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              stripePaymentStatus: 'requires_action',
            },
          })
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object
        const bookingId = charge.metadata?.bookingId
        const paymentIntentId = charge.payment_intent

        if (bookingId || paymentIntentId) {
          // Find booking by ID or payment intent
          const booking = bookingId
            ? await prisma.booking.findUnique({ where: { id: bookingId } })
            : await prisma.booking.findFirst({
                where: { stripePaymentIntentId: paymentIntentId },
              })

          if (booking) {
            const isFullRefund = charge.amount_refunded === charge.amount
            await prisma.booking.update({
              where: { id: booking.id },
              data: {
                status: isFullRefund ? BookingStatus.REFUNDED : booking.status,
                stripePaymentStatus: isFullRefund ? 'refunded' : 'partially_refunded',
                refundedAt: new Date(),
                refundAmount: charge.amount_refunded,
              },
            })
          }
        }
        break
      }

      default:
        // Unhandled event type - acknowledge receipt
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}