import { prisma } from '@/app/lib/prisma'
import { format, addDays, addHours } from 'date-fns'

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(public url: string, public init?: any) {
      this.url = url
      this.init = init
    }
    async json() {
      return JSON.parse(this.init?.body || '{}')
    }
  },
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
      ...init
    })
  }
}))

// Mock Stripe
jest.mock('@/app/lib/stripe.server', () => ({
  stripe: {
    paymentIntents: {
      retrieve: jest.fn(),
    }
  }
}))

// Mock authentication
jest.mock('@/app/lib/auth/session.server', () => ({
  getUserSession: jest.fn(),
}))

// Import after mocking
const { POST } = require('@/app/api/bookings/confirm/route')
const { NextRequest } = require('next/server')
const mockStripe = require('@/app/lib/stripe.server').stripe
const mockGetUserSession = require('@/app/lib/auth/session.server').getUserSession

// Mock the response object
function createMockRequest(url: string, body: any): any {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/bookings/confirm', () => {
  let testUser: any
  let testBooking: any
  let testPackage: any
  let testExtra: any
  let testPaymentIntent: any

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks()

    // Clean up test data in reverse dependency order
    await prisma.emailQueue.deleteMany()
    await prisma.bookingItem.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.packageAvailability.deleteMany()
    await prisma.extraAvailability.deleteMany()
    await prisma.package.deleteMany()
    await prisma.extra.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'CUSTOMER'
      }
    })

    // Create test package
    testPackage = await prisma.package.create({
      data: {
        name: 'VIP Table',
        description: 'Premium table with bottle service',
        inclusions: ['Reserved seating', 'Bottle service', 'Dedicated host'],
        maxGuests: 8,
        defaultPrice: 500.00,
        isActive: true
      }
    })

    // Create test extra
    testExtra = await prisma.extra.create({
      data: {
        name: 'Premium Champagne',
        description: 'Dom Perignon bottle',
        price: 150.00,
        isActive: true
      }
    })

    const bookingDate = addDays(new Date(), 7)

    // Create package availability
    await prisma.packageAvailability.create({
      data: {
        packageId: testPackage.id,
        date: bookingDate,
        totalQuantity: 10,
        availableQuantity: 8,
        isAvailable: true
      }
    })

    // Create extra availability
    await prisma.extraAvailability.create({
      data: {
        extraId: testExtra.id,
        date: bookingDate,
        totalQuantity: 20,
        availableQuantity: 15,
        isAvailable: true
      }
    })

    // Create test booking
    testBooking = await prisma.booking.create({
      data: {
        bookingReference: 'TEST-REF-001',
        userId: testUser.id,
        bookingDate: bookingDate,
        status: 'PENDING',
        totalAmount: 650.00,
        discountAmount: 0.00,
        finalAmount: 650.00,
        items: {
          create: [
            {
              itemType: 'PACKAGE',
              packageId: testPackage.id,
              quantity: 1,
              unitPrice: 500.00,
              totalPrice: 500.00
            },
            {
              itemType: 'EXTRA',
              extraId: testExtra.id,
              quantity: 1,
              unitPrice: 150.00,
              totalPrice: 150.00
            }
          ]
        }
      },
      include: {
        items: true
      }
    })

    // Mock payment intent
    testPaymentIntent = {
      id: 'pi_test123456',
      status: 'succeeded',
      amount: 65000, // $650.00 in cents
      currency: 'usd',
      metadata: {
        bookingId: testBooking.id,
        userId: testUser.id
      }
    }
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Successful Confirmation Flow', () => {
    it('should confirm booking with valid payment intent', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.booking).toBeDefined()
      expect(data.booking.bookingReference).toBe('TEST-REF-001')
      expect(data.booking.status).toBe('CONFIRMED')
      expect(data.booking.stripePaymentId).toBe('pi_test123456')
    })

    it('should generate unique booking reference if not already set', async () => {
      // Arrange
      const bookingWithoutRef = await prisma.booking.create({
        data: {
          bookingReference: '', // Will be generated
          userId: testUser.id,
          bookingDate: addDays(new Date(), 8),
          status: 'PENDING',
          totalAmount: 500.00,
          finalAmount: 500.00
        }
      })

      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        ...testPaymentIntent,
        metadata: { bookingId: bookingWithoutRef.id, userId: testUser.id }
      })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: bookingWithoutRef.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.booking.bookingReference).toMatch(/^[A-Z0-9]{6,12}$/)
      expect(data.booking.bookingReference).not.toBe('')
    })

    it('should update booking status from PENDING to CONFIRMED', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: testBooking.id }
      })
      expect(updatedBooking?.status).toBe('CONFIRMED')
    })

    it('should store Stripe payment ID', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: testBooking.id }
      })
      expect(updatedBooking?.stripePaymentId).toBe('pi_test123456')
    })

    it('should update package availability (decrement quantities)', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      const beforeAvailability = await prisma.packageAvailability.findUnique({
        where: {
          packageId_date: {
            packageId: testPackage.id,
            date: testBooking.bookingDate
          }
        }
      })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const afterAvailability = await prisma.packageAvailability.findUnique({
        where: {
          packageId_date: {
            packageId: testPackage.id,
            date: testBooking.bookingDate
          }
        }
      })
      expect(afterAvailability?.availableQuantity).toBe(beforeAvailability!.availableQuantity - 1)
    })

    it('should update extra availability (decrement quantities)', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      const beforeAvailability = await prisma.extraAvailability.findUnique({
        where: {
          extraId_date: {
            extraId: testExtra.id,
            date: testBooking.bookingDate
          }
        }
      })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const afterAvailability = await prisma.extraAvailability.findUnique({
        where: {
          extraId_date: {
            extraId: testExtra.id,
            date: testBooking.bookingDate
          }
        }
      })
      expect(afterAvailability?.availableQuantity).toBe(beforeAvailability!.availableQuantity - 1)
    })

    it('should create confirmation email queue entry', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const confirmationEmail = await prisma.emailQueue.findFirst({
        where: {
          recipient: testUser.email,
          emailType: 'BOOKING_CONFIRMATION'
        }
      })
      expect(confirmationEmail).toBeDefined()
      expect(confirmationEmail?.status).toBe('PENDING')
      expect(confirmationEmail?.content).toHaveProperty('bookingReference', 'TEST-REF-001')
    })

    it('should create 24hr reminder email queue entry', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const reminderEmail = await prisma.emailQueue.findFirst({
        where: {
          recipient: testUser.email,
          emailType: 'BOOKING_REMINDER'
        }
      })
      expect(reminderEmail).toBeDefined()
      expect(reminderEmail?.status).toBe('PENDING')
      
      const expectedReminderTime = addHours(testBooking.bookingDate, -24)
      expect(new Date(reminderEmail!.scheduledFor).getTime()).toBeCloseTo(expectedReminderTime.getTime(), -2)
    })

    it('should return complete booking details with reference', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.booking).toHaveProperty('id')
      expect(data.booking).toHaveProperty('bookingReference')
      expect(data.booking).toHaveProperty('status', 'CONFIRMED')
      expect(data.booking).toHaveProperty('bookingDate')
      expect(data.booking).toHaveProperty('finalAmount', 650)
      expect(data.booking).toHaveProperty('items')
      expect(data.booking.items).toHaveLength(2)
      expect(data.booking.items[0]).toHaveProperty('package')
      expect(data.booking.items[1]).toHaveProperty('extra')
    })
  })

  describe('Payment Validation', () => {
    it('should validate payment intent with Stripe', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      await POST(request)

      // Assert
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test123456')
    })

    it('should reject invalid payment intent ID', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('No such payment_intent: pi_invalid'))

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_invalid'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(422)
      expect(data.error).toContain('Invalid payment intent')
    })

    it('should reject unpaid payment intent', async () => {
      // Arrange
      const unpaidPaymentIntent = {
        ...testPaymentIntent,
        status: 'requires_payment_method'
      }
      
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(unpaidPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(422)
      expect(data.error).toContain('Payment not completed')
    })

    it('should reject payment intent for wrong amount', async () => {
      // Arrange
      const wrongAmountPaymentIntent = {
        ...testPaymentIntent,
        amount: 50000 // $500 instead of $650
      }
      
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(wrongAmountPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(422)
      expect(data.error).toContain('Payment amount mismatch')
    })

    it('should handle Stripe API errors gracefully', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Stripe service unavailable'))

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toContain('Payment validation failed')
    })
  })

  describe('Booking Validation', () => {
    it('should reject non-existent booking ID', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: 'nonexistent-id',
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toContain('Booking not found')
    })

    it('should reject already confirmed booking', async () => {
      // Arrange
      const confirmedBooking = await prisma.booking.create({
        data: {
          bookingReference: 'CONFIRMED-REF-001',
          userId: testUser.id,
          bookingDate: addDays(new Date(), 9),
          status: 'CONFIRMED',
          totalAmount: 500.00,
          finalAmount: 500.00
        }
      })

      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: confirmedBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toContain('Booking already confirmed')
    })

    it('should reject cancelled booking', async () => {
      // Arrange
      const cancelledBooking = await prisma.booking.create({
        data: {
          bookingReference: 'CANCELLED-REF-001',
          userId: testUser.id,
          bookingDate: addDays(new Date(), 10),
          status: 'CANCELLED',
          totalAmount: 500.00,
          finalAmount: 500.00
        }
      })

      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: cancelledBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toContain('Cannot confirm cancelled booking')
    })

    it('should reject booking without items', async () => {
      // Arrange
      const emptyBooking = await prisma.booking.create({
        data: {
          bookingReference: 'EMPTY-REF-001',
          userId: testUser.id,
          bookingDate: addDays(new Date(), 11),
          status: 'PENDING',
          totalAmount: 0.00,
          finalAmount: 0.00
        }
      })

      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: emptyBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(422)
      expect(data.error).toContain('Booking has no items')
    })

    it('should validate booking belongs to authenticated user', async () => {
      // Arrange
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          name: 'Other User',
          role: 'CUSTOMER'
        }
      })

      const otherUserBooking = await prisma.booking.create({
        data: {
          bookingReference: 'OTHER-REF-001',
          userId: otherUser.id,
          bookingDate: addDays(new Date(), 12),
          status: 'PENDING',
          totalAmount: 500.00,
          finalAmount: 500.00
        }
      })

      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: otherUserBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toContain('Access denied')
    })
  })

  describe('Database Operations', () => {
    it('should update booking atomically (transaction)', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Mock database to simulate transaction behavior
      const prismaTransactionSpy = jest.spyOn(prisma, '$transaction')

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(prismaTransactionSpy).toHaveBeenCalled()
    })

    it('should handle database connection errors', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Mock database error
      const originalFindUnique = prisma.booking.findUnique
      prisma.booking.findUnique = jest.fn().mockRejectedValue(new Error('Connection lost'))

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toContain('Database error')

      // Cleanup
      prisma.booking.findUnique = originalFindUnique
    })

    it('should rollback on any failure', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Mock email creation to fail
      const originalEmailCreate = prisma.emailQueue.create
      prisma.emailQueue.create = jest.fn().mockRejectedValue(new Error('Email service down'))

      const beforeBooking = await prisma.booking.findUnique({
        where: { id: testBooking.id }
      })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(500)
      
      const afterBooking = await prisma.booking.findUnique({
        where: { id: testBooking.id }
      })
      expect(afterBooking?.status).toBe(beforeBooking?.status) // Should not have changed

      // Cleanup
      prisma.emailQueue.create = originalEmailCreate
    })

    it('should handle unique constraint violation on reference', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Create another booking with a reference that might collide
      await prisma.booking.create({
        data: {
          bookingReference: 'DUPLICATE-REF',
          userId: testUser.id,
          bookingDate: addDays(new Date(), 13),
          status: 'CONFIRMED',
          totalAmount: 400.00,
          finalAmount: 400.00
        }
      })

      // Mock reference generation to return duplicate
      const mockGenerateReference = jest.fn()
        .mockReturnValueOnce('DUPLICATE-REF')
        .mockReturnValueOnce('UNIQUE-REF')

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      // Should retry and succeed with a unique reference
    })

    it('should update availability tables correctly', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      const beforePackageAvail = await prisma.packageAvailability.findUnique({
        where: {
          packageId_date: {
            packageId: testPackage.id,
            date: testBooking.bookingDate
          }
        }
      })

      const beforeExtraAvail = await prisma.extraAvailability.findUnique({
        where: {
          extraId_date: {
            extraId: testExtra.id,
            date: testBooking.bookingDate
          }
        }
      })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)

      const afterPackageAvail = await prisma.packageAvailability.findUnique({
        where: {
          packageId_date: {
            packageId: testPackage.id,
            date: testBooking.bookingDate
          }
        }
      })

      const afterExtraAvail = await prisma.extraAvailability.findUnique({
        where: {
          extraId_date: {
            extraId: testExtra.id,
            date: testBooking.bookingDate
          }
        }
      })

      expect(afterPackageAvail?.availableQuantity).toBe(beforePackageAvail!.availableQuantity - 1)
      expect(afterExtraAvail?.availableQuantity).toBe(beforeExtraAvail!.availableQuantity - 1)
    })
  })

  describe('Email Queue Creation', () => {
    it('should queue confirmation email with correct recipient', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const confirmationEmail = await prisma.emailQueue.findFirst({
        where: {
          recipient: testUser.email,
          emailType: 'BOOKING_CONFIRMATION'
        }
      })
      
      expect(confirmationEmail?.recipient).toBe(testUser.email)
      expect(confirmationEmail?.subject).toContain('Booking Confirmation')
    })

    it('should queue reminder email scheduled for 24hrs before event', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const reminderEmail = await prisma.emailQueue.findFirst({
        where: {
          recipient: testUser.email,
          emailType: 'BOOKING_REMINDER'
        }
      })
      
      const expectedScheduledTime = addHours(testBooking.bookingDate, -24)
      expect(reminderEmail?.scheduledFor.getTime()).toBeCloseTo(expectedScheduledTime.getTime(), -2)
    })

    it('should include all booking details in email content', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      const confirmationEmail = await prisma.emailQueue.findFirst({
        where: {
          recipient: testUser.email,
          emailType: 'BOOKING_CONFIRMATION'
        }
      })
      
      const emailContent = confirmationEmail?.content as any
      expect(emailContent).toHaveProperty('bookingReference', 'TEST-REF-001')
      expect(emailContent).toHaveProperty('bookingDate')
      expect(emailContent).toHaveProperty('finalAmount', 650)
      expect(emailContent).toHaveProperty('items')
      expect(emailContent.items).toHaveLength(2)
    })

    it('should handle email service errors gracefully', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Mock email queue creation to fail
      const originalEmailCreate = prisma.emailQueue.create
      prisma.emailQueue.create = jest.fn().mockRejectedValue(new Error('Email service unavailable'))

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toContain('Email scheduling failed')

      // Cleanup
      prisma.emailQueue.create = originalEmailCreate
    })
  })

  describe('Error Handling', () => {
    it('should return 400 for missing required fields', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act - Missing paymentIntentId
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Payment intent ID is required')
    })

    it('should return 400 for invalid booking ID format', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: 'invalid-format',
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid booking ID format')
    })

    it('should return 404 for booking not found', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: 'clxxxxxxxxxxxxxxxxxxxxxxx',
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Booking not found')
    })

    it('should return 409 for already confirmed booking', async () => {
      // Arrange
      const confirmedBooking = await prisma.booking.create({
        data: {
          bookingReference: 'ALREADY-CONFIRMED',
          userId: testUser.id,
          bookingDate: addDays(new Date(), 14),
          status: 'CONFIRMED',
          totalAmount: 500.00,
          finalAmount: 500.00,
          stripePaymentId: 'pi_already_paid'
        }
      })

      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: confirmedBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe('Booking already confirmed')
    })

    it('should return 422 for payment validation failure', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        ...testPaymentIntent,
        status: 'requires_action'
      })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(422)
      expect(data.error).toContain('Payment not completed')
    })

    it('should return 500 for internal server errors', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Internal server error'))

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should provide meaningful error messages', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })

      // Act - Missing bookingId
      const request = createMockRequest('/api/bookings/confirm', {
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Booking ID is required')
      expect(data.error).not.toContain('undefined')
      expect(data.error).not.toContain('null')
    })
  })

  describe('Authentication', () => {
    it('should require valid session/auth', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue(null)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject unauthorized requests', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: null })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate user owns the booking', async () => {
      // Arrange
      const differentUser = await prisma.user.create({
        data: {
          email: 'different@example.com',
          name: 'Different User',
          role: 'CUSTOMER'
        }
      })

      mockGetUserSession.mockResolvedValue({ user: { id: differentUser.id } })

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('Response Format', () => {
    it('should return booking with reference and confirmation details', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('booking')
      expect(data).toHaveProperty('paymentConfirmation')
      expect(data).toHaveProperty('emailScheduled')
      
      expect(data.booking).toHaveProperty('bookingReference')
      expect(data.booking).toHaveProperty('status', 'CONFIRMED')
      expect(data.paymentConfirmation).toHaveProperty('paymentIntentId', 'pi_test123456')
    })

    it('should include all booking items with details', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.booking.items).toHaveLength(2)
      
      const packageItem = data.booking.items.find((item: any) => item.itemType === 'PACKAGE')
      const extraItem = data.booking.items.find((item: any) => item.itemType === 'EXTRA')
      
      expect(packageItem).toHaveProperty('package')
      expect(packageItem.package).toHaveProperty('name', 'VIP Table')
      expect(extraItem).toHaveProperty('extra')
      expect(extraItem.extra).toHaveProperty('name', 'Premium Champagne')
    })

    it('should include payment confirmation', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.paymentConfirmation).toHaveProperty('paymentIntentId', 'pi_test123456')
      expect(data.paymentConfirmation).toHaveProperty('amount', 65000)
      expect(data.paymentConfirmation).toHaveProperty('currency', 'usd')
      expect(data.paymentConfirmation).toHaveProperty('status', 'succeeded')
    })

    it('should include estimated delivery times for emails', async () => {
      // Arrange
      mockGetUserSession.mockResolvedValue({ user: { id: testUser.id } })
      mockStripe.paymentIntents.retrieve.mockResolvedValue(testPaymentIntent)

      // Act
      const request = createMockRequest('/api/bookings/confirm', {
        bookingId: testBooking.id,
        paymentIntentId: 'pi_test123456'
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.emailScheduled).toHaveProperty('confirmationEmail')
      expect(data.emailScheduled).toHaveProperty('reminderEmail')
      
      expect(data.emailScheduled.confirmationEmail).toHaveProperty('scheduledFor')
      expect(data.emailScheduled.reminderEmail).toHaveProperty('scheduledFor')
      
      // Confirmation should be scheduled for immediate delivery
      const confirmationTime = new Date(data.emailScheduled.confirmationEmail.scheduledFor)
      expect(confirmationTime.getTime()).toBeCloseTo(new Date().getTime(), -5000) // Within 5 seconds
      
      // Reminder should be 24hrs before event
      const reminderTime = new Date(data.emailScheduled.reminderEmail.scheduledFor)
      const expectedReminderTime = addHours(testBooking.bookingDate, -24)
      expect(reminderTime.getTime()).toBeCloseTo(expectedReminderTime.getTime(), -2)
    })
  })
})