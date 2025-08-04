# Database Schema Documentation

## Overview
This document contains the complete database schema for the Nightclub Booking System, including all tables, relationships, and type definitions.

## Database Provider
- **Provider**: Neon PostgreSQL
- **ORM**: Prisma
- **Connection**: Serverless PostgreSQL

## Schema Status
✅ **Status**: Schema defined, awaiting database connection

## Setup Instructions

### 1. Create Neon Database
1. Sign up at [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string
4. Update `.env` file with your DATABASE_URL

### 2. Run Migrations
```bash
# Generate Prisma Client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy
```

## Tables

### Core Authentication Tables (Auth.js)
- **User** - Core user accounts with role-based access
- **Account** - OAuth provider accounts
- **Session** - User sessions
- **VerificationToken** - Email verification tokens

### Booking System Tables
- **Booking** - Customer bookings with references and payment info
- **BookingItem** - Line items for each booking (packages/extras)
- **Package** - Available packages (VIP booths, tables, etc.)
- **PackagePricing** - Date-specific pricing for packages
- **PackageAvailability** - Real-time availability tracking
- **Extra** - Additional items (bottles, add-ons)
- **ExtraAvailability** - Availability for extras

### Configuration Tables
- **BlackoutDate** - Dates when bookings are disabled
- **DailyCutoffTime** - Booking cutoff times per day
- **PromoCode** - Discount codes with usage tracking

### Communication Tables
- **EmailQueue** - Scheduled email notifications

## Prisma Schema
The complete schema is defined in `/prisma/schema.prisma`

Key features:
- Cascade deletes for data integrity
- Unique constraints on business keys
- Indexes on frequently queried fields
- Enums for type safety

## TypeScript Types

### Enums
```typescript
// User roles
enum UserRole {
  CUSTOMER
  ADMIN
}

// Booking statuses
enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  REFUNDED
}

// Discount types
enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

// Item types for booking items
enum ItemType {
  PACKAGE
  EXTRA
}

// Email types
enum EmailType {
  BOOKING_CONFIRMATION
  BOOKING_REMINDER
  REFUND_NOTIFICATION
  ADMIN_NOTIFICATION
}

// Email statuses
enum EmailStatus {
  PENDING
  SENT
  FAILED
}
```

### Generated Types
After running `npx prisma generate`, all model types are available from:
```typescript
import { User, Booking, Package, /* etc */ } from '@prisma/client'
```

## Database Connection
```typescript
// app/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## Common Queries

### Find available packages for a date
```typescript
const availablePackages = await prisma.package.findMany({
  where: {
    isActive: true,
    availability: {
      some: {
        date: targetDate,
        isAvailable: true,
        availableQuantity: { gt: 0 }
      }
    }
  },
  include: {
    pricing: {
      where: { date: targetDate }
    },
    availability: {
      where: { date: targetDate }
    }
  }
})
```

### Create booking with items
```typescript
const booking = await prisma.booking.create({
  data: {
    bookingReference: generateReference(),
    userId: user.id,
    bookingDate: date,
    totalAmount: total,
    finalAmount: finalTotal,
    items: {
      create: bookingItems
    }
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
```

### Check blackout dates
```typescript
const isBlackoutDate = await prisma.blackoutDate.findFirst({
  where: { date: targetDate }
})
```

## Performance Considerations
- Connection pooling handled by Prisma
- Indexes on: booking dates, user emails, package/extra availability
- Use `include` sparingly to avoid N+1 queries
- Consider pagination for large result sets

## Backup & Recovery
- Neon provides automatic backups
- Point-in-time recovery available
- Consider implementing soft deletes for critical data
- Regular exports for compliance