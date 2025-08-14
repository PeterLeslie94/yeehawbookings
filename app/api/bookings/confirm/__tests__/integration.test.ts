// Mock the modules before importing
jest.mock('@/app/lib/stripe.server', () => ({
  stripe: {
    paymentIntents: {
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
    packageAvailability: {
      update: jest.fn(),
    },
    extraAvailability: {
      update: jest.fn(),
    },
    emailQueue: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/app/lib/auth/session.server', () => ({
  getUserSession: jest.fn(),
}))

jest.mock('@/app/lib/booking/reference', () => ({
  generateBookingReference: jest.fn(),
}))

import { POST } from '../route'
import { NextRequest } from 'next/server'
import { addHours } from 'date-fns'

// Get mocked functions
const mockStripe = require('@/app/lib/stripe.server').stripe
const mockPrisma = require('@/app/lib/prisma').prisma
const mockGetUserSession = require('@/app/lib/auth/session.server').getUserSession
const mockGenerateBookingReference = require('@/app/lib/booking/reference').generateBookingReference

describe('Booking Confirmation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Confirmation Flow', () => {
    it('should complete full confirmation workflow for authenticated user booking', async () => {
      const bookingDate = new Date('2025-08-14T20:00:00Z')
      const reminderTime = addHours(bookingDate, -24)

      const mockBooking = {
        id: 'booking-1',
        bookingReference: '',
        userId: 'user-1',
        guestEmail: null,
        guestName: null,
        bookingDate,
        status: 'PENDING',
        totalAmount: 15000,
        discountAmount: 0,
        finalAmount: 15000,
        currency: 'gbp',
        items: [
          {
            id: 'item-1',
            itemType: 'PACKAGE',
            packageId: 'pkg-1',
            quantity: 2,
            unitPrice: 5000,
            totalPrice: 10000,
            package: {
              id: 'pkg-1',
              name: 'VIP Booth'
            }
          },
          {
            id: 'item-2',
            itemType: 'EXTRA',
            extraId: 'extra-1',
            quantity: 1,
            unitPrice: 5000,
            totalPrice: 5000,
            extra: {
              id: 'extra-1',
              name: 'Bottle Service'
            }
          }
        ],
        user: {
          id: 'user-1',
          email: 'user@example.com'
        }
      }

      const updatedBooking = {
        ...mockBooking,
        bookingReference: 'NCB-20250814-ABC123',
        status: 'CONFIRMED',
        stripePaymentId: 'pi_test123'
      }

      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 15000,
        currency: 'gbp'
      }

      const mockConfirmationEmail = {
        id: 'email-1',
        scheduledFor: new Date()
      }

      const mockReminderEmail = {
        id: 'email-2',
        scheduledFor: reminderTime
      }

      // Setup mocks
      mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)
      mockGenerateBookingReference.mockReturnValue('NCB-20250814-ABC123')

      // Mock transaction to execute callback
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Mock the transaction context
        const tx = {
          booking: {
            update: jest.fn().mockResolvedValue(updatedBooking),
          },
          packageAvailability: {
            update: jest.fn().mockResolvedValue({}),
          },
          extraAvailability: {
            update: jest.fn().mockResolvedValue({}),
          },
          emailQueue: {
            create: jest.fn()
              .mockResolvedValueOnce(mockConfirmationEmail)
              .mockResolvedValueOnce(mockReminderEmail),
          },
        }

        return callback(tx)
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: 'booking-1',
          paymentIntentId: 'pi_test123'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Verify successful response
      expect(response.status).toBe(200)
      expect(data.booking.bookingReference).toBe('NCB-20250814-ABC123')
      expect(data.booking.status).toBe('CONFIRMED')
      expect(data.paymentConfirmation.status).toBe('succeeded')
      expect(data.emailScheduled).toBeDefined()

      // Verify transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)

      // Verify payment intent was retrieved
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test123')

      // Verify booking reference was generated
      expect(mockGenerateBookingReference).toHaveBeenCalledTimes(1)
    })

    it('should complete confirmation workflow for guest booking', async () => {
      const bookingDate = new Date('2025-08-14T20:00:00Z')

      const mockGuestBooking = {
        id: 'booking-guest-1',
        bookingReference: '',
        userId: null,
        guestEmail: 'guest@example.com',
        guestName: 'Jane Doe',
        bookingDate,
        status: 'PENDING',
        totalAmount: 10000,
        finalAmount: 10000,
        items: [
          {
            id: 'item-3',
            itemType: 'PACKAGE',
            packageId: 'pkg-2',
            quantity: 1,
            unitPrice: 10000,
            totalPrice: 10000,
            package: {
              id: 'pkg-2',
              name: 'Standard Table'
            }
          }
        ],
        user: null
      }

      const mockPaymentIntent = {
        id: 'pi_guest123',
        status: 'succeeded',
        amount: 10000,
        currency: 'gbp'
      }

      mockGetUserSession.mockResolvedValue(null) // No session for guest
      mockPrisma.booking.findUnique.mockResolvedValue(mockGuestBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)
      mockGenerateBookingReference.mockReturnValue('NCB-20250814-GUEST1')

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          booking: {
            update: jest.fn().mockResolvedValue({
              ...mockGuestBooking,
              bookingReference: 'NCB-20250814-GUEST1',
              status: 'CONFIRMED'
            }),
          },
          packageAvailability: { update: jest.fn() },
          extraAvailability: { update: jest.fn() },
          emailQueue: {
            create: jest.fn()
              .mockResolvedValueOnce({ id: 'conf-email-1' })
              .mockResolvedValueOnce({ id: 'reminder-email-1' }),
          },
        }

        return callback(tx)
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-guest-1',
          paymentIntentId: 'pi_guest123'
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.booking.bookingReference).toBe('NCB-20250814-GUEST1')
    })
  })

  describe('Email Queue Creation', () => {
    it('should create confirmation and reminder emails with correct content', async () => {
      const bookingDate = new Date('2025-08-15T21:00:00Z')
      const reminderTime = addHours(bookingDate, -24)

      const mockBooking = {
        id: 'booking-email-1',
        bookingReference: 'NCB-20250815-EMAIL1',
        userId: 'user-1',
        bookingDate,
        finalAmount: 12500,
        items: [
          {
            itemType: 'PACKAGE',
            quantity: 1,
            unitPrice: 12500,
            totalPrice: 12500,
            package: { name: 'Premium Booth' },
            extra: null
          }
        ],
        user: { email: 'test@example.com' }
      }

      const mockPaymentIntent = {
        id: 'pi_email_test',
        status: 'succeeded',
        amount: 12500
      }

      mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)

      let confirmationEmailData, reminderEmailData

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          booking: { update: jest.fn().mockResolvedValue(mockBooking) },
          packageAvailability: { update: jest.fn() },
          extraAvailability: { update: jest.fn() },
          emailQueue: {
            create: jest.fn()
              .mockImplementation((data) => {
                if (data.data.emailType === 'BOOKING_CONFIRMATION') {
                  confirmationEmailData = data.data
                  return { id: 'conf-1', scheduledFor: new Date() }
                } else if (data.data.emailType === 'BOOKING_REMINDER') {
                  reminderEmailData = data.data
                  return { id: 'remind-1', scheduledFor: reminderTime }
                }
              })
          },
        }

        return callback(tx)
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-email-1',
          paymentIntentId: 'pi_email_test'
        }),
      })

      await POST(request)

      // Verify confirmation email was created
      expect(confirmationEmailData).toMatchObject({
        recipient: 'test@example.com',
        subject: 'Booking Confirmation - Country Days',
        emailType: 'BOOKING_CONFIRMATION',
        status: 'PENDING',
        content: {
          bookingReference: 'NCB-20250815-EMAIL1',
          bookingDate: bookingDate.toISOString(),
          finalAmount: 12500,
          items: [
            {
              itemType: 'PACKAGE',
              name: 'Premium Booth',
              quantity: 1,
              unitPrice: 12500,
              totalPrice: 12500
            }
          ]
        }
      })

      // Verify reminder email was created
      expect(reminderEmailData).toMatchObject({
        recipient: 'test@example.com',
        subject: 'Booking Reminder - Country Days',
        emailType: 'BOOKING_REMINDER',
        status: 'PENDING',
        content: {
          bookingReference: 'NCB-20250815-EMAIL1',
          bookingDate: bookingDate.toISOString(),
          finalAmount: 12500
        }
      })

      // Verify reminder is scheduled 24 hours before event
      expect(reminderEmailData.scheduledFor).toEqual(reminderTime)
    })

    it('should use guest email for email notifications', async () => {
      const mockGuestBooking = {
        id: 'guest-booking-1',
        userId: null,
        guestEmail: 'guest@test.com',
        guestName: 'Guest User',
        bookingDate: new Date('2025-08-16T19:00:00Z'),
        finalAmount: 8000,
        items: [],
        user: null
      }

      mockGetUserSession.mockResolvedValue(null)
      mockPrisma.booking.findUnique.mockResolvedValue(mockGuestBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_guest_email',
        status: 'succeeded',
        amount: 8000
      })

      let emailRecipient

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          booking: { update: jest.fn().mockResolvedValue(mockGuestBooking) },
          packageAvailability: { update: jest.fn() },
          extraAvailability: { update: jest.fn() },
          emailQueue: {
            create: jest.fn().mockImplementation((data) => {
              emailRecipient = data.data.recipient
              return { id: 'email-1', scheduledFor: new Date() }
            })
          },
        }

        return callback(tx)
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'guest-booking-1',
          paymentIntentId: 'pi_guest_email'
        }),
      })

      await POST(request)

      expect(emailRecipient).toBe('guest@test.com')
    })
  })

  describe('Availability Updates', () => {
    it('should update package and extra availability after confirmation', async () => {
      const mockBooking = {
        id: 'booking-avail-1',
        bookingReference: 'NCB-20250817-AVAIL1',
        userId: 'user-1',
        bookingDate: new Date('2025-08-17T20:00:00Z'),
        finalAmount: 20000,
        items: [
          {
            itemType: 'PACKAGE',
            packageId: 'pkg-avail-1',
            quantity: 3,
            package: { name: 'Group Package' }
          },
          {
            itemType: 'EXTRA',
            extraId: 'extra-avail-1',
            quantity: 2,
            extra: { name: 'Bottle Package' }
          }
        ],
        user: { email: 'avail@test.com' }
      }

      mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_avail_test',
        status: 'succeeded',
        amount: 20000
      })

      let packageAvailUpdate, extraAvailUpdate

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          booking: { update: jest.fn().mockResolvedValue(mockBooking) },
          packageAvailability: {
            update: jest.fn().mockImplementation((params) => {
              packageAvailUpdate = params
              return {}
            })
          },
          extraAvailability: {
            update: jest.fn().mockImplementation((params) => {
              extraAvailUpdate = params
              return {}
            })
          },
          emailQueue: { create: jest.fn().mockResolvedValue({ id: 'email-1' }) },
        }

        return callback(tx)
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-avail-1',
          paymentIntentId: 'pi_avail_test'
        }),
      })

      await POST(request)

      // Verify package availability was decremented
      expect(packageAvailUpdate).toMatchObject({
        where: {
          packageId_date: {
            packageId: 'pkg-avail-1',
            date: new Date('2025-08-17T20:00:00Z')
          }
        },
        data: {
          availableQuantity: { decrement: 3 }
        }
      })

      // Verify extra availability was decremented
      expect(extraAvailUpdate).toMatchObject({
        where: {
          extraId_date: {
            extraId: 'extra-avail-1',
            date: new Date('2025-08-17T20:00:00Z')
          }
        },
        data: {
          availableQuantity: { decrement: 2 }
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle payment intent validation failures', async () => {
      const mockBooking = {
        id: 'booking-error-1',
        userId: 'user-1',
        status: 'PENDING',
        finalAmount: 5000,
        items: [],
        user: { email: 'error@test.com' }
      }

      mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_failed',
        status: 'failed', // Payment failed
        amount: 5000
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-error-1',
          paymentIntentId: 'pi_failed'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data).toEqual({ error: 'Payment not completed' })
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('should handle amount mismatch between payment and booking', async () => {
      const mockBooking = {
        id: 'booking-mismatch-1',
        userId: 'user-1',
        status: 'PENDING',
        finalAmount: 10000, // $100.00
        items: [],
        user: { email: 'mismatch@test.com' }
      }

      mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_wrong_amount',
        status: 'succeeded',
        amount: 15000 // $150.00 - wrong amount
      })

      const request = new NextRequest('http://localhost:3000/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-mismatch-1',
          paymentIntentId: 'pi_wrong_amount'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data).toEqual({ error: 'Payment amount mismatch' })
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('should rollback transaction on database errors', async () => {
      const mockBooking = {
        id: 'booking-rollback-1',
        userId: 'user-1',
        status: 'PENDING',
        finalAmount: 7500,
        items: [{ itemType: 'PACKAGE', packageId: 'pkg-1', quantity: 1 }],
        user: { email: 'rollback@test.com' }
      }

      mockGetUserSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking)
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_rollback',
        status: 'succeeded',
        amount: 7500
      })

      // Mock transaction to throw error
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-rollback-1',
          paymentIntentId: 'pi_rollback'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })
})