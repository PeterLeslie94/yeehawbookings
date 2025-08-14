// Mock the modules before importing
jest.mock('@/app/lib/stripe.server', () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
}))

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/app/lib/auth/session.server', () => ({
  getUserSession: jest.fn(),
}))

import { POST } from '../route'
import { NextRequest } from 'next/server'

// Get mocked functions
const mockStripe = require('@/app/lib/stripe.server').stripe
const mockPrisma = require('@/app/lib/prisma').prisma
const mockGetUserSession = require('@/app/lib/auth/session.server').getUserSession

describe('POST /api/bookings/create-payment-intent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create a payment intent for a valid booking', async () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1',
      totalAmount: 15000, // $150.00
      finalAmount: 15000,
      currency: 'usd',
      status: 'PENDING',
      stripePaymentIntentId: null,
    }

    const mockPaymentIntent = {
      id: 'pi_test123',
      client_secret: 'pi_test123_secret',
      amount: 15000,
      currency: 'usd',
    }

    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
    mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)
    mockPrisma.booking.update.mockResolvedValue({
      ...mockBooking,
      stripePaymentIntentId: 'pi_test123',
    })

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      clientSecret: 'pi_test123_secret',
      amount: 15000,
      currency: 'usd',
    })

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
      amount: 15000,
      currency: 'usd',
      metadata: {
        bookingId: 'booking-1',
        userId: 'user-1',
      },
    })

    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { stripePaymentIntentId: 'pi_test123' },
    })
  })

  it('should return 403 if authenticated booking accessed without auth', async () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1', // Booking belongs to a user
      totalAmount: 15000,
      finalAmount: 15000,
      status: 'PENDING',
    }

    mockGetUserSession.mockResolvedValue(null) // No session
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: 'Forbidden' })
  })

  it('should return 400 if bookingId is missing', async () => {
    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Booking ID is required' })
  })

  it('should return 404 if booking does not exist', async () => {
    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'non-existent' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Booking not found' })
  })

  it('should return 403 if booking belongs to another user', async () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'other-user',
      totalAmount: 15000,
      finalAmount: 15000,
      status: 'PENDING',
    }

    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: 'Forbidden' })
  })

  it('should return existing payment intent if already created', async () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1',
      totalAmount: 15000,
      finalAmount: 15000,
      currency: 'usd',
      status: 'PENDING',
      stripePaymentIntentId: 'pi_existing123',
    }

    const mockPaymentIntent = {
      id: 'pi_existing123',
      client_secret: 'pi_existing123_secret',
      amount: 15000,
      currency: 'usd',
    }

    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
    mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      clientSecret: 'pi_existing123_secret',
      amount: 15000,
      currency: 'usd',
    })

    expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_existing123')
    expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled()
  })

  it('should handle Stripe errors gracefully', async () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1',
      totalAmount: 15000,
      finalAmount: 15000,
      status: 'PENDING',
      stripePaymentIntentId: null,
    }

    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
    mockStripe.paymentIntents.create.mockRejectedValue(new Error('Stripe error'))

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to create payment intent' })
  })

  it('should apply promo code discount if provided', async () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1',
      totalAmount: 15000,
      finalAmount: 12000, // After discount
      currency: 'usd',
      status: 'PENDING',
      stripePaymentIntentId: null,
      promoCode: 'SUMMER20',
      discountAmount: 3000, // 20% off
    }

    const mockPaymentIntent = {
      id: 'pi_test123',
      client_secret: 'pi_test123_secret',
      amount: 12000, // 15000 - 3000
      currency: 'usd',
    }

    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
    mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)
    mockPrisma.booking.update.mockResolvedValue({
      ...mockBooking,
      stripePaymentIntentId: 'pi_test123',
    })

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.amount).toBe(12000)

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
      amount: 12000,
      currency: 'usd',
      metadata: {
        bookingId: 'booking-1',
        userId: 'user-1',
        promoCode: 'SUMMER20',
        discountAmount: '3000',
      },
    })
  })

  describe('Guest Checkout', () => {
    it('should create a payment intent for a guest booking', async () => {
      const mockBooking = {
        id: 'booking-guest-1',
        userId: null,
        guestEmail: 'guest@example.com',
        guestName: 'John Doe',
        totalAmount: 10000,
        finalAmount: 10000,
        currency: 'gbp',
        status: 'PENDING',
        stripePaymentIntentId: null,
      }

      const mockPaymentIntent = {
        id: 'pi_guest123',
        client_secret: 'pi_guest123_secret',
        amount: 10000,
        currency: 'gbp',
      }

      mockGetUserSession.mockResolvedValue(null) // No authentication for guest
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        stripePaymentIntentId: 'pi_guest123',
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: 'booking-guest-1' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        clientSecret: 'pi_guest123_secret',
        amount: 10000,
        currency: 'gbp',
      })

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000,
        currency: 'gbp',
        metadata: {
          bookingId: 'booking-guest-1',
          guestEmail: 'guest@example.com',
          guestName: 'John Doe',
        },
      })

      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-guest-1' },
        data: { stripePaymentIntentId: 'pi_guest123' },
      })
    })

    it('should create a payment intent for a guest booking with promo code', async () => {
      const mockBooking = {
        id: 'booking-guest-2',
        userId: null,
        guestEmail: 'guest@example.com',
        guestName: 'Jane Smith',
        totalAmount: 20000,
        finalAmount: 16000, // With discount applied
        discountAmount: 4000,
        currency: 'gbp',
        status: 'PENDING',
        stripePaymentIntentId: null,
        promoCode: 'GUEST20',
      }

      const mockPaymentIntent = {
        id: 'pi_guest_promo123',
        client_secret: 'pi_guest_promo123_secret',
        amount: 16000, // Final amount after discount
        currency: 'gbp',
      }

      mockGetUserSession.mockResolvedValue(null) // Guest checkout
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        stripePaymentIntentId: 'pi_guest_promo123',
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: 'booking-guest-2' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.amount).toBe(16000)

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 16000,
        currency: 'gbp',
        metadata: {
          bookingId: 'booking-guest-2',
          guestEmail: 'guest@example.com',
          guestName: 'Jane Smith',
          promoCode: 'GUEST20',
          discountAmount: '4000',
        },
      })
    })

    it('should return existing payment intent for guest booking', async () => {
      const mockBooking = {
        id: 'booking-guest-3',
        userId: null,
        guestEmail: 'guest@example.com',
        guestName: 'Bob Wilson',
        totalAmount: 8000,
        currency: 'gbp',
        status: 'PENDING',
        stripePaymentIntentId: 'pi_guest_existing123',
      }

      const mockPaymentIntent = {
        id: 'pi_guest_existing123',
        client_secret: 'pi_guest_existing123_secret',
        amount: 8000,
        currency: 'gbp',
      }

      mockGetUserSession.mockResolvedValue(null)
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)

      const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: 'booking-guest-3' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        clientSecret: 'pi_guest_existing123_secret',
        amount: 8000,
        currency: 'gbp',
      })

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_guest_existing123')
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled()
    })

    it('should validate guest booking exists and has required fields', async () => {
      const mockBooking = {
        id: 'booking-guest-4',
        userId: null,
        guestEmail: null, // Missing guest email
        guestName: null,  // Missing guest name
        totalAmount: 5000,
        currency: 'gbp',
        status: 'PENDING',
        stripePaymentIntentId: null,
      }

      mockGetUserSession.mockResolvedValue(null)
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)

      const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: 'booking-guest-4' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Guest booking requires email and name')
    })
  })
})