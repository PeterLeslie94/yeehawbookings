import { prisma } from '@/app/lib/prisma'

// Mock Next.js request/response for API route testing
async function testSignupEndpoint(body: any) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return response
}

describe('Signup API Route', () => {
  beforeEach(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const signupData = {
        email: 'test.signup@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      }

      // Act
      const response = await testSignupEndpoint(signupData)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe(signupData.email)
      expect(data.user.name).toBe(signupData.name)
      expect(data.user.password).toBeUndefined() // Password should not be returned

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: signupData.email }
      })
      expect(user).toBeDefined()
      expect(user?.role).toBe('CUSTOMER')
    })

    it('should hash the password before storing', async () => {
      // Arrange
      const signupData = {
        email: 'test.hash@example.com',
        password: 'PlainTextPassword123!',
        name: 'Hash Test'
      }

      // Act
      await testSignupEndpoint(signupData)

      // Assert
      const user = await prisma.user.findUnique({
        where: { email: signupData.email }
      })
      expect(user?.password).toBeDefined()
      expect(user?.password).not.toBe(signupData.password)
      expect(user?.password?.startsWith('$2')).toBe(true) // bcrypt hash prefix
    })

    it('should reject duplicate email', async () => {
      // Arrange
      const signupData = {
        email: 'test.duplicate@example.com',
        password: 'Password123!',
        name: 'First User'
      }

      // Create first user
      await testSignupEndpoint(signupData)

      // Act - Try to create duplicate
      const response = await testSignupEndpoint({
        ...signupData,
        name: 'Second User'
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })

    it('should validate required fields', async () => {
      // Arrange & Act - Missing email
      const response1 = await testSignupEndpoint({
        password: 'Password123!',
        name: 'Test User'
      })

      // Assert
      expect(response1.status).toBe(400)
      const data1 = await response1.json()
      expect(data1.error).toContain('Email is required')

      // Act - Missing password
      const response2 = await testSignupEndpoint({
        email: 'test@example.com',
        name: 'Test User'
      })

      // Assert
      expect(response2.status).toBe(400)
      const data2 = await response2.json()
      expect(data2.error).toContain('Password is required')
    })

    it('should validate email format', async () => {
      // Arrange
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com'
      ]

      // Act & Assert
      for (const email of invalidEmails) {
        const response = await testSignupEndpoint({
          email,
          password: 'Password123!',
          name: 'Test User'
        })
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Invalid email')
      }
    })

    it('should enforce password requirements', async () => {
      // Arrange
      const weakPasswords = [
        { password: '123', error: 'at least 8 characters' },
        { password: 'password', error: 'at least one number' },
        { password: 'PASSWORD123', error: 'lowercase letter' },
        { password: 'password123', error: 'uppercase letter' }
      ]

      // Act & Assert
      for (const { password, error } of weakPasswords) {
        const response = await testSignupEndpoint({
          email: 'test.password@example.com',
          password,
          name: 'Test User'
        })
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.toLowerCase()).toContain(error)
      }
    })

    it('should trim whitespace from email', async () => {
      // Arrange
      const signupData = {
        email: '  test.trim@example.com  ',
        password: 'Password123!',
        name: 'Trim Test'
      }

      // Act
      await testSignupEndpoint(signupData)

      // Assert
      const user = await prisma.user.findUnique({
        where: { email: 'test.trim@example.com' }
      })
      expect(user).toBeDefined()
    })

    it('should handle optional name field', async () => {
      // Arrange
      const signupData = {
        email: 'test.noname@example.com',
        password: 'Password123!'
      }

      // Act
      const response = await testSignupEndpoint(signupData)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.user.email).toBe(signupData.email)
      expect(data.user.name).toBeNull()
    })
  })
})