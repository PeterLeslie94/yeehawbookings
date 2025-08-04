import { prisma } from '@/app/lib/prisma'
import { hashPassword } from '@/app/lib/auth/password'
import { UserRole } from '@prisma/client'

// Mock Next.js request/response for API route testing
async function testLoginEndpoint(body: any) {
  const response = await fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return response
}

describe('Login Authentication', () => {
  let testUser: any

  beforeEach(async () => {
    // Clean up and create test user
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    })

    const hashedPassword = await hashPassword('TestPassword123!')
    testUser = await prisma.user.create({
      data: {
        email: 'test.login@example.com',
        name: 'Test Login User',
        password: hashedPassword,
        role: UserRole.CUSTOMER
      }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Credentials Provider', () => {
    it('should authenticate valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test.login@example.com',
        password: 'TestPassword123!'
      }

      // Act
      const response = await testLoginEndpoint(credentials)

      // Assert
      expect(response.status).toBe(200)
      const session = await response.json()
      expect(session.user).toBeDefined()
      expect(session.user.email).toBe(credentials.email)
      expect(session.user.role).toBe('CUSTOMER')
      expect(session.user.password).toBeUndefined()
    })

    it('should reject invalid password', async () => {
      // Arrange
      const credentials = {
        email: 'test.login@example.com',
        password: 'WrongPassword123!'
      }

      // Act
      const response = await testLoginEndpoint(credentials)

      // Assert
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Invalid credentials')
    })

    it('should reject non-existent user', async () => {
      // Arrange
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      }

      // Act
      const response = await testLoginEndpoint(credentials)

      // Assert
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Invalid credentials')
    })

    it('should handle case-insensitive email', async () => {
      // Arrange
      const credentials = {
        email: 'TEST.LOGIN@EXAMPLE.COM',
        password: 'TestPassword123!'
      }

      // Act
      const response = await testLoginEndpoint(credentials)

      // Assert
      expect(response.status).toBe(200)
      const session = await response.json()
      expect(session.user.email).toBe('test.login@example.com')
    })

    it('should include user role in session', async () => {
      // Arrange - Create admin user
      const adminPassword = await hashPassword('AdminPassword123!')
      await prisma.user.create({
        data: {
          email: 'test.admin@example.com',
          name: 'Test Admin',
          password: adminPassword,
          role: UserRole.ADMIN
        }
      })

      const credentials = {
        email: 'test.admin@example.com',
        password: 'AdminPassword123!'
      }

      // Act
      const response = await testLoginEndpoint(credentials)

      // Assert
      expect(response.status).toBe(200)
      const session = await response.json()
      expect(session.user.role).toBe('ADMIN')
    })

    it('should validate required fields', async () => {
      // Act - Missing email
      const response1 = await testLoginEndpoint({
        password: 'Password123!'
      })

      // Assert
      expect(response1.status).toBe(400)
      const data1 = await response1.json()
      expect(data1.error).toContain('Email is required')

      // Act - Missing password
      const response2 = await testLoginEndpoint({
        email: 'test@example.com'
      })

      // Assert
      expect(response2.status).toBe(400)
      const data2 = await response2.json()
      expect(data2.error).toContain('Password is required')
    })

    it('should handle users without password (OAuth users)', async () => {
      // Arrange - Create user without password
      await prisma.user.create({
        data: {
          email: 'test.oauth@example.com',
          name: 'OAuth User',
          // No password field
        }
      })

      const credentials = {
        email: 'test.oauth@example.com',
        password: 'AnyPassword123!'
      }

      // Act
      const response = await testLoginEndpoint(credentials)

      // Assert
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Please use your social login')
    })

    it('should update last login timestamp', async () => {
      // Arrange
      const credentials = {
        email: 'test.login@example.com',
        password: 'TestPassword123!'
      }
      const originalUpdatedAt = testUser.updatedAt

      // Act
      await testLoginEndpoint(credentials)

      // Assert
      const updatedUser = await prisma.user.findUnique({
        where: { email: credentials.email }
      })
      expect(updatedUser?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should handle concurrent login attempts', async () => {
      // Arrange
      const credentials = {
        email: 'test.login@example.com',
        password: 'TestPassword123!'
      }

      // Act - Multiple concurrent requests
      const responses = await Promise.all([
        testLoginEndpoint(credentials),
        testLoginEndpoint(credentials),
        testLoginEndpoint(credentials)
      ])

      // Assert - All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })
})