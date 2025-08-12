// Mock the modules before importing
jest.mock('@/app/lib/stripe.server', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}))

jest.mock('@/app/lib/db.server', () => ({
  db: {
    booking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { POST } from '../route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

// Get mocked functions
const mockStripe = require('@/app/lib/stripe.server').stripe
const mockDb = require('@/app/lib/db.server').db

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  const createWebhookRequest = (payload: any, signature?: string) => {
    const body = JSON.stringify(payload)
    const timestamp = Math.floor(Date.now() / 1000)
    
    if (!signature && process.env.STRIPE_WEBHOOK_SECRET) {
      const signedPayload = `${timestamp}.${body}`
      const secret = process.env.STRIPE_WEBHOOK_SECRET
      signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex')
    }

    return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': `t=${timestamp},v1=${signature}`,
        'content-type': 'application/json',
      },
      body: body,
    })
  }

  it('should handle payment_intent.succeeded event', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount: 15000,
          currency: 'usd',
          metadata: {
            bookingId: 'booking-1',
            userId: 'user-1',
          },
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    mockDb.booking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'CONFIRMED',
      stripePaymentStatus: 'succeeded',
    })

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })

    expect(mockDb.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: 'CONFIRMED',
        stripePaymentStatus: 'succeeded',
        paidAt: expect.any(Date),
      },
    })
  })

  it('should handle payment_intent.payment_failed event', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test123',
          amount: 15000,
          currency: 'usd',
          metadata: {
            bookingId: 'booking-1',
            userId: 'user-1',
          },
          last_payment_error: {
            message: 'Your card was declined.',
          },
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    mockDb.booking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'PENDING',
      stripePaymentStatus: 'failed',
    })

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })

    expect(mockDb.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        stripePaymentStatus: 'failed',
        paymentError: 'Your card was declined.',
      },
    })
  })

  it('should handle payment_intent.canceled event', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'payment_intent.canceled',
      data: {
        object: {
          id: 'pi_test123',
          metadata: {
            bookingId: 'booking-1',
          },
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    mockDb.booking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'CANCELLED',
      stripePaymentStatus: 'canceled',
    })

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(200)

    expect(mockDb.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: 'CANCELLED',
        stripePaymentStatus: 'canceled',
      },
    })
  })

  it('should handle charge.refunded event', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test123',
          payment_intent: 'pi_test123',
          amount: 15000,
          amount_refunded: 15000,
          metadata: {
            bookingId: 'booking-1',
          },
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    mockDb.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      stripePaymentIntentId: 'pi_test123',
      status: 'CONFIRMED',
    })
    mockDb.booking.update.mockResolvedValue({
      id: 'booking-1',
      status: 'REFUNDED',
      stripePaymentStatus: 'refunded',
    })

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(200)

    expect(mockDb.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: 'REFUNDED',
        stripePaymentStatus: 'refunded',
        refundedAt: expect.any(Date),
        refundAmount: 15000,
      },
    })
  })

  it('should return 400 for invalid webhook signature', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Webhook signature verification failed')
    })

    const request = createWebhookRequest({ test: 'data' }, 'invalid_signature')
    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Invalid webhook signature',
    })
  })

  it('should return 400 if webhook secret is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET

    const request = createWebhookRequest({ test: 'data' })
    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Webhook secret not configured',
    })
  })

  it('should handle missing stripe signature header', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ test: 'data' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Missing stripe-signature header',
    })
  })

  it('should ignore unhandled event types', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'customer.created',
      data: {
        object: {
          id: 'cus_test123',
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })

    expect(mockDb.booking.update).not.toHaveBeenCalled()
  })

  it('should handle database errors gracefully', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          metadata: {
            bookingId: 'booking-1',
          },
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    mockDb.booking.update.mockRejectedValue(new Error('Database error'))

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'Webhook processing failed',
    })
  })

  it('should handle payment_intent.requires_action event', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'payment_intent.requires_action',
      data: {
        object: {
          id: 'pi_test123',
          metadata: {
            bookingId: 'booking-1',
          },
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    mockDb.booking.update.mockResolvedValue({
      id: 'booking-1',
      stripePaymentStatus: 'requires_action',
    })

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(200)

    expect(mockDb.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        stripePaymentStatus: 'requires_action',
      },
    })
  })

  it('should skip processing if bookingId is missing from metadata', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          metadata: {}, // No bookingId
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockDb.booking.update).not.toHaveBeenCalled()
  })

  it('should handle partial refunds correctly', async () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test123',
          payment_intent: 'pi_test123',
          amount_refunded: 5000, // Partial refund
          amount: 15000, // Original amount
          metadata: {
            bookingId: 'booking-1',
          },
        },
      },
    }

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
    mockDb.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      stripePaymentIntentId: 'pi_test123',
      status: 'CONFIRMED',
    })
    mockDb.booking.update.mockResolvedValue({
      id: 'booking-1',
      stripePaymentStatus: 'partially_refunded',
    })

    const request = createWebhookRequest(mockEvent)
    const response = await POST(request)

    expect(response.status).toBe(200)

    expect(mockDb.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: 'CONFIRMED', // Keep existing status for partial refund
        stripePaymentStatus: 'partially_refunded',
        refundedAt: expect.any(Date),
        refundAmount: 5000,
      },
    })
  })
})