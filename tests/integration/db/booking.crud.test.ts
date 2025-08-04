import { PrismaClient, BookingStatus, UserRole } from '@prisma/client'

describe('Booking CRUD Operations', () => {
  let prisma: PrismaClient
  let testUser: any

  beforeAll(async () => {
    prisma = new PrismaClient()
    
    // Create a test user for bookings
    testUser = await prisma.user.create({
      data: {
        email: 'booking.test.user@example.com',
        name: 'Booking Test User',
        role: UserRole.CUSTOMER
      }
    })
  })

  afterAll(async () => {
    // Clean up test user and related bookings
    await prisma.user.delete({
      where: { id: testUser.id }
    })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test bookings before each test
    await prisma.booking.deleteMany({
      where: { 
        OR: [
          { userId: testUser.id },
          { guestEmail: { contains: 'test' } }
        ]
      }
    })
  })

  describe('Create Operations', () => {
    it('should create a booking for registered user', async () => {
      // Arrange
      const bookingData = {
        bookingReference: 'TEST-001',
        userId: testUser.id,
        bookingDate: new Date('2024-12-20T20:00:00Z'),
        totalAmount: 150.00,
        discountAmount: 0,
        finalAmount: 150.00,
        customerNotes: 'Birthday party',
        status: BookingStatus.CONFIRMED
      }

      // Act
      const booking = await prisma.booking.create({ data: bookingData })

      // Assert
      expect(booking).toBeDefined()
      expect(booking.id).toBeDefined()
      expect(booking.bookingReference).toBe(bookingData.bookingReference)
      expect(booking.userId).toBe(testUser.id)
      expect(booking.finalAmount).toBe(150.00)
      expect(booking.status).toBe(BookingStatus.CONFIRMED)
      expect(booking.customerNotes).toBe('Birthday party')
    })

    it('should create a guest booking', async () => {
      // Arrange
      const bookingData = {
        bookingReference: 'GUEST-001',
        guestEmail: 'guest.test@example.com',
        guestName: 'Guest User',
        bookingDate: new Date('2024-12-21T21:00:00Z'),
        totalAmount: 200.00,
        finalAmount: 200.00
      }

      // Act
      const booking = await prisma.booking.create({ data: bookingData })

      // Assert
      expect(booking.userId).toBeNull()
      expect(booking.guestEmail).toBe(bookingData.guestEmail)
      expect(booking.guestName).toBe(bookingData.guestName)
    })

    it('should create booking with promo code discount', async () => {
      // Arrange
      const promoCode = await prisma.promoCode.create({
        data: {
          code: 'TEST20',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31')
        }
      })

      const bookingData = {
        bookingReference: 'PROMO-001',
        userId: testUser.id,
        bookingDate: new Date('2024-12-20T20:00:00Z'),
        totalAmount: 100.00,
        discountAmount: 20.00,
        finalAmount: 80.00,
        promoCodeId: promoCode.id
      }

      // Act
      const booking = await prisma.booking.create({ 
        data: bookingData,
        include: { promoCode: true }
      })

      // Assert
      expect(booking.promoCodeId).toBe(promoCode.id)
      expect(booking.discountAmount).toBe(20.00)
      expect(booking.finalAmount).toBe(80.00)
      expect(booking.promoCode?.code).toBe('TEST20')

      // Cleanup
      await prisma.promoCode.delete({ where: { id: promoCode.id } })
    })

    it('should enforce unique booking reference', async () => {
      // Arrange
      const bookingData = {
        bookingReference: 'UNIQUE-001',
        userId: testUser.id,
        bookingDate: new Date('2024-12-20'),
        totalAmount: 100.00,
        finalAmount: 100.00
      }

      // Act
      await prisma.booking.create({ data: bookingData })

      // Assert
      await expect(
        prisma.booking.create({ data: bookingData })
      ).rejects.toThrow()
    })
  })

  describe('Read Operations', () => {
    it('should find booking by reference', async () => {
      // Arrange
      const booking = await prisma.booking.create({
        data: {
          bookingReference: 'FIND-001',
          userId: testUser.id,
          bookingDate: new Date('2024-12-20'),
          totalAmount: 100.00,
          finalAmount: 100.00
        }
      })

      // Act
      const found = await prisma.booking.findUnique({
        where: { bookingReference: 'FIND-001' }
      })

      // Assert
      expect(found).toBeDefined()
      expect(found?.id).toBe(booking.id)
    })

    it('should find all bookings for a user', async () => {
      // Arrange
      await prisma.booking.createMany({
        data: [
          {
            bookingReference: 'USER-001',
            userId: testUser.id,
            bookingDate: new Date('2024-12-20'),
            totalAmount: 100.00,
            finalAmount: 100.00
          },
          {
            bookingReference: 'USER-002',
            userId: testUser.id,
            bookingDate: new Date('2024-12-21'),
            totalAmount: 150.00,
            finalAmount: 150.00
          }
        ]
      })

      // Act
      const bookings = await prisma.booking.findMany({
        where: { userId: testUser.id },
        orderBy: { bookingDate: 'asc' }
      })

      // Assert
      expect(bookings).toHaveLength(2)
      expect(bookings[0].bookingReference).toBe('USER-001')
      expect(bookings[1].bookingReference).toBe('USER-002')
    })

    it('should find bookings by date range', async () => {
      // Arrange
      await prisma.booking.createMany({
        data: [
          {
            bookingReference: 'DATE-001',
            userId: testUser.id,
            bookingDate: new Date('2024-12-19'),
            totalAmount: 100.00,
            finalAmount: 100.00
          },
          {
            bookingReference: 'DATE-002',
            userId: testUser.id,
            bookingDate: new Date('2024-12-20'),
            totalAmount: 100.00,
            finalAmount: 100.00
          },
          {
            bookingReference: 'DATE-003',
            userId: testUser.id,
            bookingDate: new Date('2024-12-21'),
            totalAmount: 100.00,
            finalAmount: 100.00
          }
        ]
      })

      // Act
      const bookings = await prisma.booking.findMany({
        where: {
          bookingDate: {
            gte: new Date('2024-12-20'),
            lte: new Date('2024-12-21')
          }
        },
        orderBy: { bookingDate: 'asc' }
      })

      // Assert
      expect(bookings).toHaveLength(2)
      expect(bookings.map(b => b.bookingReference)).toEqual(['DATE-002', 'DATE-003'])
    })

    it('should include booking items when requested', async () => {
      // Arrange
      const booking = await prisma.booking.create({
        data: {
          bookingReference: 'ITEMS-001',
          userId: testUser.id,
          bookingDate: new Date('2024-12-20'),
          totalAmount: 100.00,
          finalAmount: 100.00
        }
      })

      // Act
      const bookingWithItems = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { items: true }
      })

      // Assert
      expect(bookingWithItems?.items).toBeDefined()
      expect(Array.isArray(bookingWithItems?.items)).toBe(true)
    })
  })

  describe('Update Operations', () => {
    it('should update booking status', async () => {
      // Arrange
      const booking = await prisma.booking.create({
        data: {
          bookingReference: 'STATUS-001',
          userId: testUser.id,
          bookingDate: new Date('2024-12-20'),
          totalAmount: 100.00,
          finalAmount: 100.00,
          status: BookingStatus.PENDING
        }
      })

      // Act
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED }
      })

      // Assert
      expect(updated.status).toBe(BookingStatus.CONFIRMED)
    })

    it('should update Stripe payment ID', async () => {
      // Arrange
      const booking = await prisma.booking.create({
        data: {
          bookingReference: 'STRIPE-001',
          userId: testUser.id,
          bookingDate: new Date('2024-12-20'),
          totalAmount: 100.00,
          finalAmount: 100.00
        }
      })

      // Act
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { stripePaymentId: 'pi_test_123456' }
      })

      // Assert
      expect(updated.stripePaymentId).toBe('pi_test_123456')
    })

    it('should cancel and refund booking', async () => {
      // Arrange
      const booking = await prisma.booking.create({
        data: {
          bookingReference: 'CANCEL-001',
          userId: testUser.id,
          bookingDate: new Date('2024-12-20'),
          totalAmount: 100.00,
          finalAmount: 100.00,
          status: BookingStatus.CONFIRMED,
          stripePaymentId: 'pi_test_123'
        }
      })

      // Act
      const cancelled = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.REFUNDED }
      })

      // Assert
      expect(cancelled.status).toBe(BookingStatus.REFUNDED)
    })
  })

  describe('Delete Operations', () => {
    it('should delete a booking and cascade delete items', async () => {
      // Arrange
      const package1 = await prisma.package.create({
        data: {
          name: 'Test Package',
          description: 'Test',
          inclusions: ['Item 1', 'Item 2']
        }
      })

      const booking = await prisma.booking.create({
        data: {
          bookingReference: 'DELETE-001',
          userId: testUser.id,
          bookingDate: new Date('2024-12-20'),
          totalAmount: 100.00,
          finalAmount: 100.00
        }
      })

      await prisma.bookingItem.create({
        data: {
          bookingId: booking.id,
          itemType: 'PACKAGE',
          packageId: package1.id,
          quantity: 1,
          unitPrice: 100.00,
          totalPrice: 100.00
        }
      })

      // Act
      await prisma.booking.delete({ where: { id: booking.id } })

      // Assert
      const foundBooking = await prisma.booking.findUnique({
        where: { id: booking.id }
      })
      const bookingItems = await prisma.bookingItem.findMany({
        where: { bookingId: booking.id }
      })

      expect(foundBooking).toBeNull()
      expect(bookingItems).toHaveLength(0)

      // Cleanup
      await prisma.package.delete({ where: { id: package1.id } })
    })
  })

  describe('Business Logic Validations', () => {
    it('should calculate total with multiple items', async () => {
      // Arrange
      const package1 = await prisma.package.create({
        data: {
          name: 'VIP Package',
          description: 'VIP booth',
          inclusions: ['Booth', 'Bottle service']
        }
      })

      const extra1 = await prisma.extra.create({
        data: {
          name: 'Premium Vodka',
          price: 150.00
        }
      })

      const booking = await prisma.booking.create({
        data: {
          bookingReference: 'CALC-001',
          userId: testUser.id,
          bookingDate: new Date('2024-12-20'),
          totalAmount: 450.00,
          finalAmount: 450.00,
          items: {
            create: [
              {
                itemType: 'PACKAGE',
                packageId: package1.id,
                quantity: 1,
                unitPrice: 300.00,
                totalPrice: 300.00
              },
              {
                itemType: 'EXTRA',
                extraId: extra1.id,
                quantity: 1,
                unitPrice: 150.00,
                totalPrice: 150.00
              }
            ]
          }
        },
        include: { items: true }
      })

      // Act
      const totalFromItems = booking.items.reduce((sum, item) => sum + item.totalPrice, 0)

      // Assert
      expect(booking.items).toHaveLength(2)
      expect(totalFromItems).toBe(450.00)
      expect(totalFromItems).toBe(booking.totalAmount)

      // Cleanup
      await prisma.booking.delete({ where: { id: booking.id } })
      await prisma.package.delete({ where: { id: package1.id } })
      await prisma.extra.delete({ where: { id: extra1.id } })
    })
  })
})