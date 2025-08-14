import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');

    // Validate date parameter
    if (!dateStr) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Validate date format
    const date = new Date(dateStr);
    if (isNaN(date.getTime()) || dateStr !== date.toISOString().split('T')[0]) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Check if date is Friday or Saturday
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      return NextResponse.json(
        { error: 'Pricing is only available for Fridays and Saturdays' },
        { status: 400 }
      );
    }

    // Get day of week name
    const dayOfWeekName = dayOfWeek === 5 ? 'Friday' : 'Saturday';

    // Get all active packages with their pricing for the date
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        pricing: {
          where: { date }
        }
      }
    });

    // Format pricing response
    const pricing = packages.map(pkg => {
      const customPricing = pkg.pricing[0];
      const price = customPricing?.price ?? pkg.defaultPrice ?? 0;
      const isCustomPrice = !!customPricing;
      
      return {
        packageId: pkg.id,
        packageName: pkg.name,
        maxGuests: pkg.maxGuests,
        price,
        isCustomPrice,
        ...(!customPricing && !pkg.defaultPrice ? { message: 'No pricing available' } : {})
      };
    });

    return NextResponse.json({
      date: dateStr,
      dayOfWeek: dayOfWeekName,
      pricing
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}