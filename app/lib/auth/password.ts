import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password is required')
  }
  
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || password.length === 0) {
    throw new Error('Password is required')
  }
  
  if (!hashedPassword || hashedPassword.length === 0) {
    throw new Error('Hash is required')
  }
  
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    // Handle invalid hash format
    return false
  }
}