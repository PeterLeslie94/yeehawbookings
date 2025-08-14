// Mock the modules before importing
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    package: {
      findMany: jest.fn(),
    },
    extra: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/app/lib/auth/session.server', () => ({
  getUserSession: jest.fn(),
}))

jest.mock('@/app/lib/booking/reference', () => ({
  generateBookingReference: jest.fn(),
}))

import { POST } from '@/app/api/bookings/route'
import { NextRequest } from 'next/server'

// Get mocked functions
const mockPrisma = require('@/app/lib/prisma').prisma
const mockGetUserSession = require('@/app/lib/auth/session.server').getUserSession
const mockGenerateBookingReference = require('@/app/lib/booking/reference').generateBookingReference

describe('POST /api/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateBookingReference.mockReturnValue('NCB-20250814-ABC123')
  })

  describe('Guest Booking Creation', () => {
    it('should create a booking for a guest user', async () => {
      // Mock no authentication (guest user)
      mockGetUserSession.mockResolvedValue(null)

      const mockCreatedBooking = {
        id: 'booking-123',
        bookingReference: 'NCB-20250814-ABC123',
        userId: null,
        guestEmail: 'guest@example.com',
        guestName: 'John Doe',
        bookingDate: new Date('2025-08-15T20:00:00.000Z'),
        status: 'PENDING',
        totalAmount: 15000,
        finalAmount: 15000,
        currency: 'gbp',
        customerNotes: 'Special requests here',
        items: [
          {
            id: 'item-1',
            itemType: 'PACKAGE',
            packageId: 'package-1',
            quantity: 2,
            unitPrice: 5000,
            totalPrice: 10000,
          },
          {
            id: 'item-2', 
            itemType: 'EXTRA',
            extraId: 'extra-1',
            quantity: 1,
            unitPrice: 5000,
            totalPrice: 5000,
          }
        ]
      }

      mockPrisma.booking.create.mockResolvedValue(mockCreatedBooking)

      const requestBody = {
        date: '2025-08-15T20:00:00.000Z',
        packages: [
          { packageId: 'package-1', quantity: 2, price: 10000, name: 'VIP Table' }
        ],
        extras: [
          { id: 'extra-1', quantity: 1, price: 5000, totalPrice: 5000, name: 'Champagne' }
        ],
        customer: {
          name: 'John Doe',
          email: 'guest@example.com',
          phone: '+44123456789',
          isGuest: true,
          bookingNotes: 'Special requests here',
          promoCode: null
        },
        totalAmount: 15000,
        currency: 'gbp',
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('booking-123')
      expect(data.bookingReference).toBe('NCB-20250814-ABC123')
      expect(data.guestEmail).toBe('guest@example.com')
      expect(data.guestName).toBe('John Doe')

      expect(mockPrisma.booking.create).toHaveBeenCalledWith({
        data: {
          bookingReference: 'NCB-20250814-ABC123',
          userId: null,
          guestEmail: 'guest@example.com',
          guestName: 'John Doe',
          bookingDate: new Date('2025-08-15T20:00:00.000Z'),
          status: 'PENDING',
          totalAmount: 15000,
          discountAmount: 0,
          finalAmount: 15000,
          currency: 'gbp',
          customerNotes: 'Special requests here',
          items: {
            create: [
              {
                itemType: 'PACKAGE',
                packageId: 'package-1',
                quantity: 2,
                unitPrice: 5000,
                totalPrice: 10000,
              },
              {
                itemType: 'EXTRA', 
                extraId: 'extra-1',
                quantity: 1,
                unitPrice: 5000,
                totalPrice: 5000,
              }
            ]
          }
        },
        include: {
          items: {
            include: {
              package: true,
              extra: true
            }
          }
        }
      })
    })

    it('should create a booking for an authenticated user', async () => {
      mockGetUserSession.mockResolvedValue({ user: { id: 'user-123', email: 'user@example.com' } })

      const mockCreatedBooking = {
        id: 'booking-123',
        bookingReference: 'NCB-20250814-ABC123',
        userId: 'user-123',
        guestEmail: null,
        guestName: null,
        bookingDate: new Date('2025-08-15T20:00:00.000Z'),
        status: 'PENDING',
        totalAmount: 10000,
        finalAmount: 10000,
        currency: 'gbp',
        items: []
      }

      mockPrisma.booking.create.mockResolvedValue(mockCreatedBooking)

      const requestBody = {
        date: '2025-08-15T20:00:00.000Z',
        packages: [
          { packageId: 'package-1', quantity: 2, price: 10000, name: 'VIP Table' }
        ],
        extras: [],
        customer: {
          name: 'John Doe',
          email: 'user@example.com',
          phone: '+44123456789',
          isGuest: false
        },
        totalAmount: 10000,
        currency: 'gbp',
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.userId).toBe('user-123')
      expect(data.guestEmail).toBeNull()

      expect(mockPrisma.booking.create).toHaveBeenCalledWith({
        data: {
          bookingReference: 'NCB-20250814-ABC123',
          userId: 'user-123',
          guestEmail: null,
          guestName: null,
          bookingDate: new Date('2025-08-15T20:00:00.000Z'),
          status: 'PENDING',
          totalAmount: 10000,
          discountAmount: 0,
          finalAmount: 10000,
          currency: 'gbp',
          customerNotes: null,
          items: {
            create: [
              {
                itemType: 'PACKAGE',
                packageId: 'package-1',
                quantity: 2,
                unitPrice: 5000,
                totalPrice: 10000,
              }
            ]
          }
        },
        include: {
          items: {
            include: {
              package: true,
              extra: true
            }
          }
        }
      })
    })

    it('should apply promo code discount correctly', async () => {
      mockGetUserSession.mockResolvedValue(null) // Guest user

      const mockCreatedBooking = {
        id: 'booking-123',
        totalAmount: 10000,
        finalAmount: 8000, // 20% discount applied
        discountAmount: 2000,
      }

      mockPrisma.booking.create.mockResolvedValue(mockCreatedBooking)

      const requestBody = {
        date: '2025-08-15T20:00:00.000Z',
        packages: [
          { packageId: 'package-1', quantity: 2, price: 10000, name: 'VIP Table' }
        ],
        extras: [],
        customer: {
          name: 'John Doe',
          email: 'guest@example.com',
          phone: '+44123456789',
          isGuest: true,
          promoCode: 'SAVE20',
          promoCodeData: {
            discountType: 'percentage',
            discountValue: 20
          }
        },
        totalAmount: 10000,
        currency: 'gbp',
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 10000,
            finalAmount: 8000,
            discountAmount: 2000,
          })
        })
      )
    })

    it('should return 400 for missing required fields', async () => {
      mockGetUserSession.mockResolvedValue(null)

      const requestBody = {
        // Missing date
        packages: [],
        extras: [],
        customer: {
          name: 'John Doe',
          email: 'guest@example.com'
        },
        totalAmount: 10000
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 for invalid guest data', async () => {
      mockGetUserSession.mockResolvedValue(null)

      const requestBody = {
        date: '2025-08-15T20:00:00.000Z',
        packages: [],
        extras: [],
        customer: {
          // Missing required name for guest
          email: 'guest@example.com',
          isGuest: true
        },
        totalAmount: 10000
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Customer name and email are required')
    })

    it('should handle database errors gracefully', async () => {
      mockGetUserSession.mockResolvedValue(null)
      mockPrisma.booking.create.mockRejectedValue(new Error('Database error'))

      const requestBody = {
        date: '2025-08-15T20:00:00.000Z',
        packages: [],
        extras: [],
        customer: {
          name: 'John Doe',
          email: 'guest@example.com',
          isGuest: true
        },
        totalAmount: 10000
      }

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create booking')
    })
  })
})