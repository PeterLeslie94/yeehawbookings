import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeAvailability = searchParams.get('includeAvailability') === 'true';
    const includePricing = searchParams.get('includePricing') === 'true';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Validate ID
    if (!id) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

    // Basic ID format validation (assuming CUID format)
    if (!id.match(/^c[a-z0-9]{20,}/)) {
      return NextResponse.json(
        { error: 'Invalid package ID format' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = { id };
    if (!includeInactive) {
      where.isActive = true;
    }

    // Get current date for filtering future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch package with optional related data
    const packageData = await prisma.package.findUnique({
      where,
      include: {
        ...(includeAvailability && {
          availability: {
            where: {
              date: {
                gte: today
              }
            },
            orderBy: {
              date: 'asc'
            }
          }
        }),
        ...(includePricing && {
          pricing: {
            where: {
              date: {
                gte: today
              }
            },
            orderBy: {
              date: 'asc'
            }
          }
        })
      }
    });

    if (!packageData) {
      return NextResponse.json(
        { error: includeInactive ? 'Package not found' : 'Package not found or inactive' },
        { status: 404 }
      );
    }

    // Format response
    const response: any = {
      package: {
        id: packageData.id,
        name: packageData.name,
        description: packageData.description,
        maxGuests: packageData.maxGuests,
        defaultPrice: packageData.defaultPrice,
        isActive: packageData.isActive,
        createdAt: packageData.createdAt,
        updatedAt: packageData.updatedAt
      }
    };

    // Add availability if requested
    if (includeAvailability && packageData.availability) {
      response.package.availability = packageData.availability.map(avail => ({
        date: avail.date.toISOString().split('T')[0],
        isAvailable: avail.isAvailable,
        availableQuantity: avail.availableQuantity,
        totalQuantity: avail.totalQuantity
      }));
    }

    // Add pricing if requested
    if (includePricing && packageData.pricing) {
      response.package.pricing = packageData.pricing.map(price => ({
        date: price.date.toISOString().split('T')[0],
        price: price.price
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package' },
      { status: 500 }
    );
  }
}