import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getUserSession } from '@/app/lib/auth/session.server'
import { validateBookingReference } from '@/app/lib/booking/reference'

interface RouteParams {
  params: {
    reference?: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate reference parameter
    const reference = params?.reference?.trim()
    
    if (!reference || reference === '') {
      return NextResponse.json(
        { error: 'Booking reference is required' },
        { status: 400 }
      )
    }

    // Validate booking reference format
    if (!validateBookingReference(reference)) {
      return NextResponse.json(
        { error: 'Invalid booking reference format' },
        { status: 400 }
      )
    }

    // Get user session (optional for guest bookings)
    const session = await getUserSession()
    const userId = session?.user?.id || null

    // Find booking by reference with all related data
    const booking = await prisma.booking.findFirst({
      where: {
        bookingReference: reference
      },
      include: {
        items: {
          include: {
            package: true,
            extra: true
          }
        },
        user: true,
        promoCode: true
      }
    })

    // Check if booking exists
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Access control validation
    if (booking.userId) {
      // Authenticated booking - only owner can access
      if (!userId || booking.userId !== userId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    } else {
      // Guest booking - authenticated users cannot access guest bookings
      if (userId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      // Validate guest booking has required fields
      if (!booking.guestEmail || !booking.guestName) {
        return NextResponse.json(
          { error: 'Invalid guest booking data' },
          { status: 400 }
        )
      }
    }

    // Return booking data
    return NextResponse.json(booking)

  } catch (error: any) {
    console.error('Booking retrieval error:', error)

    // Handle specific error types
    if (error.message?.includes('Database error') || 
        error.message?.includes('Connection lost') ||
        error.message?.includes('connection')) {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}