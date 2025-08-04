import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

describe('User CRUD Operations', () => {
  let prisma: PrismaClient

  beforeAll(() => {
    prisma = new PrismaClient()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    })
  })

  describe('Create Operations', () => {
    it('should create a new customer user', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('password123', 10)
      const userData = {
        email: 'test.customer@example.com',
        name: 'Test Customer',
        password: hashedPassword,
        role: UserRole.CUSTOMER
      }

      // Act
      const user = await prisma.user.create({ data: userData })

      // Assert
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.name).toBe(userData.name)
      expect(user.role).toBe(UserRole.CUSTOMER)
      expect(user.password).toBe(hashedPassword)
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should create an admin user', async () => {
      // Arrange
      const userData = {
        email: 'test.admin@example.com',
        name: 'Test Admin',
        password: await bcrypt.hash('adminpass', 10),
        role: UserRole.ADMIN
      }

      // Act
      const user = await prisma.user.create({ data: userData })

      // Assert
      expect(user.role).toBe(UserRole.ADMIN)
    })

    it('should enforce unique email constraint', async () => {
      // Arrange
      const userData = {
        email: 'test.duplicate@example.com',
        name: 'Test User',
        password: 'hashedpassword'
      }

      // Act
      await prisma.user.create({ data: userData })

      // Assert
      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow()
    })

    it('should allow user creation without password (OAuth)', async () => {
      // Arrange
      const userData = {
        email: 'test.oauth@example.com',
        name: 'OAuth User',
        image: 'https://example.com/avatar.jpg'
      }

      // Act
      const user = await prisma.user.create({ data: userData })

      // Assert
      expect(user.password).toBeNull()
      expect(user.image).toBe(userData.image)
    })
  })

  describe('Read Operations', () => {
    it('should find user by email', async () => {
      // Arrange
      const userData = {
        email: 'test.find@example.com',
        name: 'Find Me'
      }
      const created = await prisma.user.create({ data: userData })

      // Act
      const found = await prisma.user.findUnique({
        where: { email: userData.email }
      })

      // Assert
      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.email).toBe(userData.email)
    })

    it('should find all admin users', async () => {
      // Arrange
      await prisma.user.createMany({
        data: [
          { email: 'test.admin1@example.com', role: UserRole.ADMIN },
          { email: 'test.admin2@example.com', role: UserRole.ADMIN },
          { email: 'test.customer1@example.com', role: UserRole.CUSTOMER }
        ]
      })

      // Act
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN }
      })

      // Assert
      expect(admins).toHaveLength(2)
      expect(admins.every(u => u.role === UserRole.ADMIN)).toBe(true)
    })

    it('should include relations when requested', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: { email: 'test.relations@example.com' }
      })

      // Act
      const userWithRelations = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          accounts: true,
          sessions: true,
          bookings: true
        }
      })

      // Assert
      expect(userWithRelations?.accounts).toBeDefined()
      expect(userWithRelations?.sessions).toBeDefined()
      expect(userWithRelations?.bookings).toBeDefined()
      expect(Array.isArray(userWithRelations?.accounts)).toBe(true)
    })
  })

  describe('Update Operations', () => {
    it('should update user name', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: { email: 'test.update@example.com', name: 'Old Name' }
      })

      // Act
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: 'New Name' }
      })

      // Assert
      expect(updated.name).toBe('New Name')
      expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime())
    })

    it('should update user password', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: { 
          email: 'test.password@example.com',
          password: await bcrypt.hash('oldpass', 10)
        }
      })
      const newHashedPassword = await bcrypt.hash('newpass', 10)

      // Act
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { password: newHashedPassword }
      })

      // Assert
      expect(updated.password).toBe(newHashedPassword)
      const isValid = await bcrypt.compare('newpass', updated.password!)
      expect(isValid).toBe(true)
    })

    it('should verify email', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: { email: 'test.verify@example.com' }
      })
      expect(user.emailVerified).toBeNull()

      // Act
      const verified = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      })

      // Assert
      expect(verified.emailVerified).toBeInstanceOf(Date)
    })
  })

  describe('Delete Operations', () => {
    it('should delete a user', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: { email: 'test.delete@example.com' }
      })

      // Act
      const deleted = await prisma.user.delete({
        where: { id: user.id }
      })

      // Assert
      expect(deleted.id).toBe(user.id)
      
      const found = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(found).toBeNull()
    })

    it('should cascade delete user sessions and accounts', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: { email: 'test.cascade@example.com' }
      })
      
      // Create related records
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: '123456'
        }
      })

      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: 'test-token',
          expires: new Date(Date.now() + 86400000)
        }
      })

      // Act
      await prisma.user.delete({ where: { id: user.id } })

      // Assert
      const accounts = await prisma.account.findMany({
        where: { userId: user.id }
      })
      const sessions = await prisma.session.findMany({
        where: { userId: user.id }
      })
      
      expect(accounts).toHaveLength(0)
      expect(sessions).toHaveLength(0)
    })
  })
})