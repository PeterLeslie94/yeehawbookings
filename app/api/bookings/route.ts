import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getUserSession } from '@/app/lib/auth/session.server'
import { generateBookingReference } from '@/app/lib/booking/reference'
import { BookingStatus, ItemType } from '@prisma/client'

interface BookingRequestBody {
  date: string
  packages: Array<{
    packageId: string
    quantity: number
    price: number
    name?: string
  }>
  extras: Array<{
    id: string
    quantity: number
    price: number
    totalPrice: number
    name?: string
  }>
  customer: {
    name: string
    email: string
    phone: string
    isGuest?: boolean
    bookingNotes?: string
    promoCode?: string
    promoCodeData?: {
      discountType: 'percentage' | 'fixed_amount'
      discountValue: number
    }
  }
  totalAmount: number
  currency?: string
}

export async function POST(request: NextRequest) {
  try {
    // Get user session (optional - supports guest checkout)
    const session = await getUserSession()
    
    // Parse request body
    let body: BookingRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { date, packages, extras, customer, totalAmount, currency = 'gbp' } = body

    // Validate required fields
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    if (!customer.name || !customer.email) {
      return NextResponse.json({ error: 'Customer name and email are required' }, { status: 400 })
    }

    // For guest users, validate guest-specific requirements
    if (!session?.user?.id && customer.isGuest !== false) {
      if (!customer.name.trim()) {
        return NextResponse.json({ error: 'Guest name is required' }, { status: 400 })
      }
      if (!customer.email.trim()) {
        return NextResponse.json({ error: 'Guest email is required' }, { status: 400 })
      }
    }

    // Calculate discount and final amount
    let discountAmount = 0
    if (customer.promoCodeData) {
      if (customer.promoCodeData.discountType === 'percentage') {
        discountAmount = Math.round(totalAmount * customer.promoCodeData.discountValue / 100)
      } else {
        discountAmount = customer.promoCodeData.discountValue
      }
    }
    const finalAmount = totalAmount - discountAmount

    // Generate booking reference
    const bookingReference = generateBookingReference()

    // Prepare booking items
    const bookingItems = []
    
    // Add packages as booking items
    for (const pkg of packages) {
      bookingItems.push({
        itemType: ItemType.PACKAGE,
        packageId: pkg.packageId,
        quantity: pkg.quantity,
        unitPrice: pkg.price / pkg.quantity,
        totalPrice: pkg.price,
      })
    }

    // Add extras as booking items
    for (const extra of extras) {
      bookingItems.push({
        itemType: ItemType.EXTRA,
        extraId: extra.id,
        quantity: extra.quantity,
        unitPrice: extra.price,
        totalPrice: extra.totalPrice,
      })
    }

    // Create booking with related data
    const booking = await prisma.booking.create({
      data: {
        bookingReference,
        userId: session?.user?.id || null,
        guestEmail: !session?.user?.id ? customer.email : null,
        guestName: !session?.user?.id ? customer.name : null,
        bookingDate: new Date(date),
        status: BookingStatus.PENDING,
        totalAmount,
        discountAmount,
        finalAmount,
        currency,
        customerNotes: customer.bookingNotes || null,
        items: {
          create: bookingItems
        },
      },
      include: {
        items: {
          include: {
            package: true,
            extra: true
          }
        }
      }
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}