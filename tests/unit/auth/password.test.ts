import { hashPassword, verifyPassword } from '@/app/lib/auth/password'

describe('Password Hashing Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!'

      // Act
      const hashedPassword = await hashPassword(plainPassword)

      // Assert
      expect(hashedPassword).toBeDefined()
      expect(typeof hashedPassword).toBe('string')
      expect(hashedPassword).not.toBe(plainPassword)
      expect(hashedPassword.length).toBeGreaterThan(20)
    })

    it('should generate different hashes for the same password', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!'

      // Act
      const hash1 = await hashPassword(plainPassword)
      const hash2 = await hashPassword(plainPassword)

      // Assert
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty password', async () => {
      // Arrange
      const emptyPassword = ''

      // Act & Assert
      await expect(hashPassword(emptyPassword)).rejects.toThrow('Password is required')
    })

    it('should handle very long passwords', async () => {
      // Arrange
      const longPassword = 'a'.repeat(100)

      // Act
      const hashedPassword = await hashPassword(longPassword)

      // Assert
      expect(hashedPassword).toBeDefined()
      expect(typeof hashedPassword).toBe('string')
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!'
      const hashedPassword = await hashPassword(plainPassword)

      // Act
      const isValid = await verifyPassword(plainPassword, hashedPassword)

      // Assert
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      // Arrange
      const correctPassword = 'TestPassword123!'
      const wrongPassword = 'WrongPassword123!'
      const hashedPassword = await hashPassword(correctPassword)

      // Act
      const isValid = await verifyPassword(wrongPassword, hashedPassword)

      // Assert
      expect(isValid).toBe(false)
    })

    it('should handle empty password verification', async () => {
      // Arrange
      const hashedPassword = await hashPassword('TestPassword123!')

      // Act & Assert
      await expect(verifyPassword('', hashedPassword)).rejects.toThrow('Password is required')
    })

    it('should handle empty hash', async () => {
      // Act & Assert
      await expect(verifyPassword('password', '')).rejects.toThrow('Hash is required')
    })

    it('should handle invalid hash format', async () => {
      // Act & Assert
      await expect(verifyPassword('password', 'invalid-hash')).resolves.toBe(false)
    })
  })
})