import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create packages
  const packages = await Promise.all([
    prisma.package.create({
      data: {
        name: 'VIP Booth Package',
        description: 'Premium booth seating with bottle service and dedicated host',
        defaultPrice: 8500, // $85.00
        maxGuests: 8,
        inclusions: [
          'Reserved VIP booth',
          'Welcome drinks on arrival',
          'Dedicated table service',
          'Priority entry',
          'Complimentary coat check'
        ],
      },
    }),
    prisma.package.create({
      data: {
        name: 'General Admission',
        description: 'Standard entry with access to all venue areas',
        defaultPrice: 2500, // $25.00
        maxGuests: 10,
        inclusions: [
          'Venue entry',
          'Access to all public areas',
          'Participation in activities',
        ],
      },
    }),
    prisma.package.create({
      data: {
        name: 'Group Package',
        description: 'Perfect for hen parties, birthdays, and large groups',
        defaultPrice: 4000, // $40.00
        maxGuests: 20,
        inclusions: [
          'Reserved area for your group',
          'Welcome shot on arrival',
          'Group photo opportunity',
          'Priority bar access',
          'Party props and decorations'
        ],
      },
    }),
  ]);

  console.log(`✅ Created ${packages.length} packages`);

  // Create some extras
  const extras = await Promise.all([
    prisma.extra.create({
      data: {
        name: 'Bottle of Prosecco',
        description: 'Chilled bottle of premium prosecco',
        price: 3500, // $35.00
      },
    }),
    prisma.extra.create({
      data: {
        name: 'Cocktail Pitcher',
        description: 'Choose from our selection of signature cocktails',
        price: 4500, // $45.00
      },
    }),
    prisma.extra.create({
      data: {
        name: 'Food Platter',
        description: 'Selection of finger foods and snacks',
        price: 2500, // $25.00
      },
    }),
  ]);

  console.log(`✅ Created ${extras.length} extras`);

  // Create a test promo code
  const promoCode = await prisma.promoCode.create({
    data: {
      code: 'WELCOME20',
      description: '20% off for new customers',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      usageLimit: 100,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    },
  });

  console.log('✅ Created promo code:', promoCode.code);

  // Create availability for testing (next few Friday and Saturday dates)
  const testDates = [];
  const today = new Date();
  const currentDay = today.getDay();
  
  // Find next Friday (day 5) and Saturday (day 6)
  for (let i = 0; i < 30; i++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() + i);
    const dayOfWeek = testDate.getDay();
    
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
      testDates.push(testDate);
    }
    
    if (testDates.length >= 8) break; // Create 8 test dates
  }

  // Create availability for all packages on test dates
  for (const date of testDates) {
    for (const pkg of packages) {
      await prisma.packageAvailability.create({
        data: {
          packageId: pkg.id,
          date: date,
          isAvailable: true,
          availableQuantity: pkg.name === 'VIP Booth Package' ? 5 : 10, // More availability for testing
          totalQuantity: pkg.name === 'VIP Booth Package' ? 5 : 10,
        },
      });
    }
  }

  console.log(`✅ Created availability for ${testDates.length} dates`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });