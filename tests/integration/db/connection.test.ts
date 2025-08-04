import { PrismaClient } from '@prisma/client'

describe('Database Connection', () => {
  let prisma: PrismaClient

  beforeAll(() => {
    prisma = new PrismaClient()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Connection Tests', () => {
    it('should connect to the database successfully', async () => {
      // Arrange & Act
      const result = await prisma.$connect()
      
      // Assert
      expect(result).toBeUndefined() // $connect returns void on success
    })

    it('should execute a simple query', async () => {
      // Arrange & Act
      const result = await prisma.$queryRaw`SELECT 1 as test`
      
      // Assert
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
    })

    it('should handle connection errors gracefully', async () => {
      // Arrange
      const invalidPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@invalid:5432/invalid'
          }
        }
      })

      // Act & Assert
      await expect(invalidPrisma.$connect()).rejects.toThrow()
      
      // Cleanup
      await invalidPrisma.$disconnect()
    })
  })

  describe('Schema Validation', () => {
    it('should have all required models defined', async () => {
      // Arrange
      const requiredModels = [
        'user',
        'account',
        'session',
        'verificationToken',
        'booking',
        'package',
        'extra',
        'packagePricing',
        'packageAvailability',
        'extraAvailability',
        'blackoutDate',
        'promoCode',
        'bookingItem',
        'emailQueue',
        'dailyCutoffTime'
      ]

      // Act & Assert
      requiredModels.forEach(model => {
        expect(prisma).toHaveProperty(model)
        expect(typeof (prisma as any)[model]).toBe('object')
      })
    })

    it('should validate User model structure', async () => {
      // This test validates that we can create a user with the expected fields
      const userData = {
        email: `test-${Date.now()}@example.com`, // Make email unique
        name: 'Test User',
        password: 'hashedpassword',
        role: 'CUSTOMER' as const
      }

      // Act
      const user = await prisma.user.create({ data: userData })

      // Assert
      expect(user).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.name).toBe(userData.name)
      expect(user.role).toBe('CUSTOMER')
      
      // Cleanup
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {
        // User might already be deleted
      })
    })

    it('should validate Booking model structure', async () => {
      // This test validates booking model with all required fields
      const bookingData = {
        bookingReference: `TEST-REF-${Date.now()}`, // Make reference unique
        guestEmail: 'guest@example.com',
        guestName: 'Guest User',
        bookingDate: new Date('2024-12-20'),
        totalAmount: 100.00,
        finalAmount: 100.00,
        customerNotes: 'Birthday celebration'
      }

      // Act
      const booking = await prisma.booking.create({ data: bookingData })

      // Assert
      expect(booking).toBeDefined()
      expect(booking.bookingReference).toBe(bookingData.bookingReference)
      expect(booking.guestEmail).toBe(bookingData.guestEmail)
      expect(booking.totalAmount).toBe(100.00)
      
      // Cleanup
      await prisma.booking.delete({ where: { id: booking.id } }).catch(() => {
        // Booking might already be deleted
      })
    })
  })
})