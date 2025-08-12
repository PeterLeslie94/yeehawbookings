// Mock the modules before importing
jest.mock('@/app/lib/stripe.server', () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
}))

jest.mock('@/app/lib/db.server', () => ({
  db: {
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
const mockDb = require('@/app/lib/db.server').db
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
    mockDb.booking.findUnique.mockResolvedValue(mockBooking)
    mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)
    mockDb.booking.update.mockResolvedValue({
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

    expect(mockDb.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { stripePaymentIntentId: 'pi_test123' },
    })
  })

  it('should return 401 if user is not authenticated', async () => {
    mockGetUserSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
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
    mockDb.booking.findUnique.mockResolvedValue(null)

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
      status: 'PENDING',
    }

    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockDb.booking.findUnique.mockResolvedValue(mockBooking)

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
    mockDb.booking.findUnique.mockResolvedValue(mockBooking)
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
      status: 'PENDING',
      stripePaymentIntentId: null,
    }

    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockDb.booking.findUnique.mockResolvedValue(mockBooking)
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
    mockDb.booking.findUnique.mockResolvedValue(mockBooking)
    mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)
    mockDb.booking.update.mockResolvedValue({
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
})