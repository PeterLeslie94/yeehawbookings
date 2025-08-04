import { PrismaClient } from '@prisma/client'

describe('Package and Availability CRUD Operations', () => {
  let prisma: PrismaClient

  beforeAll(() => {
    prisma = new PrismaClient()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.packageAvailability.deleteMany()
    await prisma.packagePricing.deleteMany()
    await prisma.package.deleteMany({
      where: { name: { contains: 'Test' } }
    })
  })

  describe('Package CRUD Operations', () => {
    it('should create a new package', async () => {
      // Arrange
      const packageData = {
        name: 'Test VIP Package',
        description: 'VIP booth with bottle service',
        inclusions: ['VIP Booth', 'Premium Bottle', 'Dedicated Host', 'Priority Entry']
      }

      // Act
      const pkg = await prisma.package.create({ data: packageData })

      // Assert
      expect(pkg).toBeDefined()
      expect(pkg.id).toBeDefined()
      expect(pkg.name).toBe(packageData.name)
      expect(pkg.description).toBe(packageData.description)
      expect(pkg.inclusions).toEqual(packageData.inclusions)
      expect(pkg.isActive).toBe(true)
    })

    it('should update package details', async () => {
      // Arrange
      const pkg = await prisma.package.create({
        data: {
          name: 'Test Basic Package',
          description: 'Basic entry',
          inclusions: ['Entry']
        }
      })

      // Act
      const updated = await prisma.package.update({
        where: { id: pkg.id },
        data: {
          description: 'Basic entry with welcome drink',
          inclusions: ['Entry', 'Welcome Drink']
        }
      })

      // Assert
      expect(updated.description).toBe('Basic entry with welcome drink')
      expect(updated.inclusions).toContain('Welcome Drink')
    })

    it('should deactivate a package', async () => {
      // Arrange
      const pkg = await prisma.package.create({
        data: {
          name: 'Test Package to Deactivate',
          description: 'Will be deactivated',
          inclusions: ['Entry']
        }
      })

      // Act
      const deactivated = await prisma.package.update({
        where: { id: pkg.id },
        data: { isActive: false }
      })

      // Assert
      expect(deactivated.isActive).toBe(false)
    })

    it('should find active packages', async () => {
      // Arrange
      await prisma.package.createMany({
        data: [
          {
            name: 'Test Active 1',
            description: 'Active package',
            inclusions: ['Entry'],
            isActive: true
          },
          {
            name: 'Test Inactive',
            description: 'Inactive package',
            inclusions: ['Entry'],
            isActive: false
          },
          {
            name: 'Test Active 2',
            description: 'Another active package',
            inclusions: ['Entry'],
            isActive: true
          }
        ]
      })

      // Act
      const activePackages = await prisma.package.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })

      // Assert
      expect(activePackages).toHaveLength(2)
      expect(activePackages.every(p => p.isActive)).toBe(true)
    })
  })

  describe('Package Pricing Operations', () => {
    let testPackage: any

    beforeEach(async () => {
      testPackage = await prisma.package.create({
        data: {
          name: 'Test Pricing Package',
          description: 'Package for pricing tests',
          inclusions: ['Entry', 'Drink']
        }
      })
    })

    it('should create day-specific pricing', async () => {
      // Arrange
      const fridayDate = new Date('2024-12-20') // Friday
      const saturdayDate = new Date('2024-12-21') // Saturday

      // Act
      const fridayPricing = await prisma.packagePricing.create({
        data: {
          packageId: testPackage.id,
          date: fridayDate,
          price: 150.00
        }
      })

      const saturdayPricing = await prisma.packagePricing.create({
        data: {
          packageId: testPackage.id,
          date: saturdayDate,
          price: 200.00
        }
      })

      // Assert
      expect(fridayPricing.price).toBe(150.00)
      expect(saturdayPricing.price).toBe(200.00)
    })

    it('should enforce unique pricing per package per date', async () => {
      // Arrange
      const date = new Date('2024-12-20')
      await prisma.packagePricing.create({
        data: {
          packageId: testPackage.id,
          date: date,
          price: 150.00
        }
      })

      // Act & Assert
      await expect(
        prisma.packagePricing.create({
          data: {
            packageId: testPackage.id,
            date: date,
            price: 175.00
          }
        })
      ).rejects.toThrow()
    })

    it('should update pricing for a specific date', async () => {
      // Arrange
      const date = new Date('2024-12-20')
      const pricing = await prisma.packagePricing.create({
        data: {
          packageId: testPackage.id,
          date: date,
          price: 150.00
        }
      })

      // Act
      const updated = await prisma.packagePricing.update({
        where: { id: pricing.id },
        data: { price: 175.00 }
      })

      // Assert
      expect(updated.price).toBe(175.00)
    })

    it('should find pricing for a specific date', async () => {
      // Arrange
      const targetDate = new Date('2024-12-20')
      await prisma.packagePricing.createMany({
        data: [
          {
            packageId: testPackage.id,
            date: new Date('2024-12-19'),
            price: 140.00
          },
          {
            packageId: testPackage.id,
            date: targetDate,
            price: 150.00
          },
          {
            packageId: testPackage.id,
            date: new Date('2024-12-21'),
            price: 200.00
          }
        ]
      })

      // Act
      const pricing = await prisma.packagePricing.findFirst({
        where: {
          packageId: testPackage.id,
          date: targetDate
        }
      })

      // Assert
      expect(pricing?.price).toBe(150.00)
    })
  })

  describe('Package Availability Operations', () => {
    let testPackage: any

    beforeEach(async () => {
      testPackage = await prisma.package.create({
        data: {
          name: 'Test Availability Package',
          description: 'Package for availability tests',
          inclusions: ['Entry']
        }
      })
    })

    it('should create availability for a date', async () => {
      // Arrange
      const date = new Date('2024-12-20')

      // Act
      const availability = await prisma.packageAvailability.create({
        data: {
          packageId: testPackage.id,
          date: date,
          totalQuantity: 10,
          availableQuantity: 10,
          isAvailable: true
        }
      })

      // Assert
      expect(availability.totalQuantity).toBe(10)
      expect(availability.availableQuantity).toBe(10)
      expect(availability.isAvailable).toBe(true)
    })

    it('should update available quantity after booking', async () => {
      // Arrange
      const date = new Date('2024-12-20')
      const availability = await prisma.packageAvailability.create({
        data: {
          packageId: testPackage.id,
          date: date,
          totalQuantity: 10,
          availableQuantity: 10
        }
      })

      // Act - Simulate booking 2 units
      const updated = await prisma.packageAvailability.update({
        where: { id: availability.id },
        data: { availableQuantity: 8 }
      })

      // Assert
      expect(updated.availableQuantity).toBe(8)
      expect(updated.totalQuantity).toBe(10) // Total remains the same
    })

    it('should mark as unavailable when sold out', async () => {
      // Arrange
      const date = new Date('2024-12-20')
      const availability = await prisma.packageAvailability.create({
        data: {
          packageId: testPackage.id,
          date: date,
          totalQuantity: 1,
          availableQuantity: 1
        }
      })

      // Act - Simulate last unit being booked
      const updated = await prisma.packageAvailability.update({
        where: { id: availability.id },
        data: {
          availableQuantity: 0,
          isAvailable: false
        }
      })

      // Assert
      expect(updated.availableQuantity).toBe(0)
      expect(updated.isAvailable).toBe(false)
    })

    it('should find available packages for a date', async () => {
      // Arrange
      const package1 = await prisma.package.create({
        data: {
          name: 'Test Available Package',
          description: 'Available',
          inclusions: ['Entry']
        }
      })

      const package2 = await prisma.package.create({
        data: {
          name: 'Test Unavailable Package',
          description: 'Not available',
          inclusions: ['Entry']
        }
      })

      const date = new Date('2024-12-20')

      await prisma.packageAvailability.createMany({
        data: [
          {
            packageId: package1.id,
            date: date,
            totalQuantity: 10,
            availableQuantity: 5,
            isAvailable: true
          },
          {
            packageId: package2.id,
            date: date,
            totalQuantity: 10,
            availableQuantity: 0,
            isAvailable: false
          }
        ]
      })

      // Act
      const available = await prisma.packageAvailability.findMany({
        where: {
          date: date,
          isAvailable: true,
          availableQuantity: { gt: 0 }
        },
        include: { package: true }
      })

      // Assert
      expect(available).toHaveLength(1)
      expect(available[0].package.name).toBe('Test Available Package')

      // Cleanup
      await prisma.package.deleteMany({
        where: { id: { in: [package1.id, package2.id] } }
      })
    })

    it('should enforce unique availability per package per date', async () => {
      // Arrange
      const date = new Date('2024-12-20')
      await prisma.packageAvailability.create({
        data: {
          packageId: testPackage.id,
          date: date,
          totalQuantity: 10,
          availableQuantity: 10
        }
      })

      // Act & Assert
      await expect(
        prisma.packageAvailability.create({
          data: {
            packageId: testPackage.id,
            date: date,
            totalQuantity: 20,
            availableQuantity: 20
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Package with Relations', () => {
    it('should load package with pricing and availability', async () => {
      // Arrange
      const pkg = await prisma.package.create({
        data: {
          name: 'Test Full Package',
          description: 'Package with all relations',
          inclusions: ['Entry', 'Drinks']
        }
      })

      const date = new Date('2024-12-20')

      await prisma.packagePricing.create({
        data: {
          packageId: pkg.id,
          date: date,
          price: 150.00
        }
      })

      await prisma.packageAvailability.create({
        data: {
          packageId: pkg.id,
          date: date,
          totalQuantity: 10,
          availableQuantity: 8
        }
      })

      // Act
      const packageWithRelations = await prisma.package.findUnique({
        where: { id: pkg.id },
        include: {
          pricing: {
            where: { date: date }
          },
          availability: {
            where: { date: date }
          }
        }
      })

      // Assert
      expect(packageWithRelations).toBeDefined()
      expect(packageWithRelations?.pricing).toHaveLength(1)
      expect(packageWithRelations?.pricing[0].price).toBe(150.00)
      expect(packageWithRelations?.availability).toHaveLength(1)
      expect(packageWithRelations?.availability[0].availableQuantity).toBe(8)
    })
  })
})