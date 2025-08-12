import { getServerSession } from 'next-auth'
import { authOptions } from './config'

export async function getUserSession() {
  const session = await getServerSession(authOptions)
  return session
}