// Mock the modules before importing
jest.mock('@/app/lib/stripe.server', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}))

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    booking: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { POST } from '@/app/api/webhooks/stripe/route'
import { NextRequest } from 'next/server'

// Get mocked functions
const mockStripe = require('@/app/lib/stripe.server').stripe
const mockPrisma = require('@/app/lib/prisma').prisma

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Payment Intent Succeeded', () => {
    it('should handle payment_intent.succeeded event and update booking status', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            status: 'succeeded',
            amount: 15000,
            currency: 'gbp',
            metadata: {
              bookingId: 'booking-123',
              guestEmail: 'guest@example.com',
            }
          }
        }
      }

      const mockBooking = {
        id: 'booking-123',
        status: 'PENDING',
        stripePaymentIntentId: 'pi_test123',
        finalAmount: 150.00,
      }

      const mockUpdatedBooking = {
        ...mockBooking,
        status: 'CONFIRMED',
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)
      mockPrisma.booking.update.mockResolvedValue(mockUpdatedBooking)

      const rawBody = JSON.stringify(mockEvent)
      const signature = 'whsec_test_signature'

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: rawBody,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          stripePaymentIntentId: 'pi_test123'
        }
      })

      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        data: { 
          status: 'CONFIRMED',
          stripePaymentStatus: 'succeeded',
          paidAt: expect.any(Date)
        }
      })
    })

    it('should handle payment_intent.succeeded for authenticated user booking', async () => {
      const mockEvent = {
        id: 'evt_auth123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_auth123',
            status: 'succeeded',
            amount: 20000,
            currency: 'gbp',
            metadata: {
              bookingId: 'booking-auth-123',
              userId: 'user-123',
            }
          }
        }
      }

      const mockBooking = {
        id: 'booking-auth-123',
        userId: 'user-123',
        status: 'PENDING',
        stripePaymentIntentId: 'pi_auth123',
        finalAmount: 200.00,
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'CONFIRMED'
      })

      const rawBody = JSON.stringify(mockEvent)
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'whsec_test_signature',
        },
        body: rawBody,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      
      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          stripePaymentIntentId: 'pi_auth123'
        }
      })
      
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-auth-123' },
        data: { 
          status: 'CONFIRMED',
          stripePaymentStatus: 'succeeded',
          paidAt: expect.any(Date)
        }
      })
    })

    it('should return 404 if booking not found for payment intent', async () => {
      const mockEvent = {
        id: 'evt_notfound123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_notfound123',
            status: 'succeeded',
            metadata: {
              bookingId: 'booking-nonexistent',
            }
          }
        }
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'whsec_test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Booking not found')
      expect(mockPrisma.booking.update).not.toHaveBeenCalled()
    })

    it('should handle already confirmed booking gracefully', async () => {
      const mockEvent = {
        id: 'evt_confirmed123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_confirmed123',
            status: 'succeeded',
            metadata: {
              bookingId: 'booking-confirmed',
            }
          }
        }
      }

      const mockBooking = {
        id: 'booking-confirmed',
        status: 'CONFIRMED', // Already confirmed
        stripePaymentIntentId: 'pi_confirmed123',
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'whsec_test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      // Should not attempt to update an already confirmed booking
      expect(mockPrisma.booking.update).not.toHaveBeenCalled()
    })
  })

  describe('Webhook Signature Verification', () => {
    it('should return 400 for invalid webhook signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid webhook signature')
    })

    it('should return 400 for missing stripe-signature header', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Missing stripe-signature header
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing stripe-signature header')
    })
  })

  describe('Unhandled Events', () => {
    it('should return 200 for unhandled event types', async () => {
      const mockEvent = {
        id: 'evt_unhandled123',
        type: 'invoice.created', // Unhandled event type
        data: {
          object: {
            id: 'in_test123'
          }
        }
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'whsec_test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.booking.findFirst).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockEvent = {
        id: 'evt_dberror123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_dberror123',
            status: 'succeeded',
            metadata: {
              bookingId: 'booking-dberror',
            }
          }
        }
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockPrisma.booking.findFirst.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'whsec_test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Webhook processing failed')
    })

    it('should handle missing payment intent metadata', async () => {
      const mockEvent = {
        id: 'evt_nometa123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_nometa123',
            status: 'succeeded',
            metadata: {} // Empty metadata
          }
        }
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'whsec_test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing booking ID in payment intent metadata')
    })
  })
})