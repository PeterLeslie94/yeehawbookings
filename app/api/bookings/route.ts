import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/app/lib/db.server'
import { getUserSession } from '@/app/lib/auth/session.server'
import { BookingStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, packages, extras, customer, totalAmount, currency } = body

    // Create booking with related data
    const booking = await db.booking.create({
      data: {
        userId: session.user.id,
        date: new Date(date),
        status: BookingStatus.PENDING,
        totalAmount,
        currency: currency || 'usd',
        phoneNumber: customer.phone,
        additionalInfo: customer.specialRequests,
        promoCode: customer.promoCode,
        discountAmount: customer.promoCodeData ? 
          (customer.promoCodeData.discountType === 'percentage' 
            ? Math.round(totalAmount * customer.promoCodeData.discountValue / 100)
            : customer.promoCodeData.discountValue)
          : 0,
        // Create package associations
        packages: {
          create: packages.map((pkg: any) => ({
            packageId: pkg.packageId,
            quantity: pkg.quantity,
            pricePerGuest: pkg.price / pkg.quantity,
          })),
        },
        // Create extra associations
        extras: {
          create: extras.map((extra: any) => ({
            extraId: extra.id,
            quantity: extra.quantity,
            totalPrice: extra.totalPrice,
          })),
        },
      },
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