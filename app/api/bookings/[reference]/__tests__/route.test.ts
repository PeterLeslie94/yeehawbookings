// Mock the modules before importing
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    booking: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('@/app/lib/auth/session.server', () => ({
  getUserSession: jest.fn(),
}))

jest.mock('@/app/lib/booking/reference', () => ({
  validateBookingReference: jest.fn(),
}))

import { GET } from '../route'
import { NextRequest } from 'next/server'

// Get mocked functions
const mockPrisma = require('@/app/lib/prisma').prisma
const mockGetUserSession = require('@/app/lib/auth/session.server').getUserSession
const mockValidateBookingReference = require('@/app/lib/booking/reference').validateBookingReference

describe('GET /api/bookings/[reference]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return booking details for valid reference with authenticated user', async () => {
    const mockBooking = {
      id: 'booking-1',
      bookingReference: 'NCB-20250814-ABC123',
      userId: 'user-1',
      guestEmail: null,
      guestName: null,
      bookingDate: new Date('2025-08-14T20:00:00Z'),
      status: 'CONFIRMED',
      totalAmount: 15000,
      discountAmount: 0,
      finalAmount: 15000,
      currency: 'gbp',
      customerNotes: 'Birthday celebration',
      paidAt: new Date('2025-08-10T10:30:00Z'),
      createdAt: new Date('2025-08-10T10:00:00Z'),
      items: [
        {
          id: 'item-1',
          itemType: 'PACKAGE',
          quantity: 2,
          unitPrice: 5000,
          totalPrice: 10000,
          package: {
            id: 'pkg-1',
            name: 'VIP Booth',
            description: 'Premium VIP experience',
            inclusions: ['Table service', 'Priority entry'],
            maxGuests: 8
          },
          extra: null
        },
        {
          id: 'item-2',
          itemType: 'EXTRA',
          quantity: 1,
          unitPrice: 5000,
          totalPrice: 5000,
          package: null,
          extra: {
            id: 'extra-1',
            name: 'Champagne Bottle',
            description: 'Premium champagne service',
            price: 5000
          }
        }
      ],
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com'
      },
      promoCode: null
    }

    mockValidateBookingReference.mockReturnValue(true)
    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

    const request = new NextRequest('http://localhost:3000/api/bookings/NCB-20250814-ABC123')
    const response = await GET(request, { params: { reference: 'NCB-20250814-ABC123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bookingReference).toBe('NCB-20250814-ABC123')
    expect(data.status).toBe('CONFIRMED')
    expect(data.finalAmount).toBe(15000)
    expect(data.items).toHaveLength(2)
    expect(data.user.email).toBe('john@example.com')

    expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
      where: { bookingReference: 'NCB-20250814-ABC123' },
      include: {
        items: {
          include: {
            package: true,
            extra: true
          }
        },
        user: true,
        promoCode: true
      }
    })
  })

  it('should return booking details for valid guest booking', async () => {
    const mockBooking = {
      id: 'booking-guest-1',
      bookingReference: 'NCB-20250814-XYZ789',
      userId: null,
      guestEmail: 'guest@example.com',
      guestName: 'Jane Smith',
      bookingDate: new Date('2025-08-14T20:00:00Z'),
      status: 'CONFIRMED',
      totalAmount: 10000,
      discountAmount: 1000,
      finalAmount: 9000,
      currency: 'gbp',
      customerNotes: null,
      paidAt: new Date('2025-08-10T15:30:00Z'),
      createdAt: new Date('2025-08-10T15:00:00Z'),
      items: [
        {
          id: 'item-3',
          itemType: 'PACKAGE',
          quantity: 1,
          unitPrice: 10000,
          totalPrice: 10000,
          package: {
            id: 'pkg-2',
            name: 'Standard Table',
            description: 'Standard table reservation',
            inclusions: ['Reserved seating'],
            maxGuests: 4
          },
          extra: null
        }
      ],
      user: null,
      promoCode: {
        id: 'promo-1',
        code: 'SAVE10',
        description: '10% off',
        discountType: 'PERCENTAGE',
        discountValue: 10
      }
    }

    mockValidateBookingReference.mockReturnValue(true)
    mockGetUserSession.mockResolvedValue(null) // No session for guest
    mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

    const request = new NextRequest('http://localhost:3000/api/bookings/NCB-20250814-XYZ789')
    const response = await GET(request, { params: { reference: 'NCB-20250814-XYZ789' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bookingReference).toBe('NCB-20250814-XYZ789')
    expect(data.guestEmail).toBe('guest@example.com')
    expect(data.guestName).toBe('Jane Smith')
    expect(data.discountAmount).toBe(1000)
    expect(data.promoCode.code).toBe('SAVE10')
    expect(data.user).toBeNull()
  })

  it('should return 400 for invalid booking reference format', async () => {
    mockValidateBookingReference.mockReturnValue(false)

    const request = new NextRequest('http://localhost:3000/api/bookings/invalid-ref')
    const response = await GET(request, { params: { reference: 'invalid-ref' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid booking reference format' })
    expect(mockPrisma.booking.findFirst).not.toHaveBeenCalled()
  })

  it('should return 404 for non-existent booking reference', async () => {
    mockValidateBookingReference.mockReturnValue(true)
    mockGetUserSession.mockResolvedValue(null)
    mockPrisma.booking.findFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/bookings/NCB-20250814-MISSING')
    const response = await GET(request, { params: { reference: 'NCB-20250814-MISSING' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Booking not found' })
  })

  it('should return 403 when authenticated user tries to access another users booking', async () => {
    const mockBooking = {
      id: 'booking-2',
      bookingReference: 'NCB-20250814-DEF456',
      userId: 'user-2', // Different user
      guestEmail: null,
      guestName: null,
      status: 'CONFIRMED'
    }

    mockValidateBookingReference.mockReturnValue(true)
    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } }) // Different user
    mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

    const request = new NextRequest('http://localhost:3000/api/bookings/NCB-20250814-DEF456')
    const response = await GET(request, { params: { reference: 'NCB-20250814-DEF456' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: 'Access denied' })
  })

  it('should return 403 when authenticated user tries to access guest booking', async () => {
    const mockBooking = {
      id: 'booking-guest-2',
      bookingReference: 'NCB-20250814-GUEST1',
      userId: null, // Guest booking
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: 'CONFIRMED'
    }

    mockValidateBookingReference.mockReturnValue(true)
    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } }) // Authenticated user
    mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

    const request = new NextRequest('http://localhost:3000/api/bookings/NCB-20250814-GUEST1')
    const response = await GET(request, { params: { reference: 'NCB-20250814-GUEST1' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: 'Access denied' })
  })

  it('should handle database errors gracefully', async () => {
    mockValidateBookingReference.mockReturnValue(true)
    mockGetUserSession.mockResolvedValue(null)
    mockPrisma.booking.findFirst.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/bookings/NCB-20250814-ERROR1')
    const response = await GET(request, { params: { reference: 'NCB-20250814-ERROR1' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Database error' })
  })

  it('should return booking with correct date formatting', async () => {
    const mockBooking = {
      id: 'booking-3',
      bookingReference: 'NCB-20250814-DATE01',
      userId: 'user-1',
      bookingDate: new Date('2025-08-14T19:30:00Z'),
      status: 'CONFIRMED',
      totalAmount: 5000,
      finalAmount: 5000,
      paidAt: new Date('2025-08-10T12:00:00Z'),
      createdAt: new Date('2025-08-10T11:30:00Z'),
      items: [],
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
    }

    mockValidateBookingReference.mockReturnValue(true)
    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

    const request = new NextRequest('http://localhost:3000/api/bookings/NCB-20250814-DATE01')
    const response = await GET(request, { params: { reference: 'NCB-20250814-DATE01' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bookingDate).toBe('2025-08-14T19:30:00.000Z')
    expect(data.paidAt).toBe('2025-08-10T12:00:00.000Z')
    expect(data.createdAt).toBe('2025-08-10T11:30:00.000Z')
  })

  it('should return booking with empty arrays when no items exist', async () => {
    const mockBooking = {
      id: 'booking-4',
      bookingReference: 'NCB-20250814-EMPTY1',
      userId: 'user-1',
      bookingDate: new Date('2025-08-14T20:00:00Z'),
      status: 'PENDING',
      totalAmount: 0,
      finalAmount: 0,
      items: [], // No items
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      promoCode: null
    }

    mockValidateBookingReference.mockReturnValue(true)
    mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockPrisma.booking.findFirst.mockResolvedValue(mockBooking)

    const request = new NextRequest('http://localhost:3000/api/bookings/NCB-20250814-EMPTY1')
    const response = await GET(request, { params: { reference: 'NCB-20250814-EMPTY1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toEqual([])
    expect(Array.isArray(data.items)).toBe(true)
  })

  it('should handle missing reference parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/bookings/')
    const response = await GET(request, { params: {} })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Booking reference is required' })
  })

  it('should handle empty string reference parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/bookings/')
    const response = await GET(request, { params: { reference: '' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Booking reference is required' })
  })
})