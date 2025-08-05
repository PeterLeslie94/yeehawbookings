import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {session.user.name || session.user.email}!</h2>
          <p className="text-gray-600">Role: {session.user.role}</p>
          <p className="text-gray-600">Email: {session.user.email}</p>
        </div>
      </div>
    </div>
  )
}