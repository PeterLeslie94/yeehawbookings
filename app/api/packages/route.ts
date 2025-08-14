import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minGuests = searchParams.get('minGuests');
    const includeDefaultPricing = searchParams.get('includeDefaultPricing') === 'true';

    // Validate query parameters
    if (minGuests && isNaN(parseInt(minGuests))) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (minGuests) {
      where.maxGuests = {
        gte: parseInt(minGuests)
      };
    }

    // Fetch packages
    const packages = await prisma.package.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        description: true,
        maxGuests: true,
        defaultPrice: true,
        inclusions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}