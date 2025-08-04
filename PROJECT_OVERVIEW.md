# Nightclub Booking System - Feature Brief

## Problem Statement
The nightclub currently lacks an online booking system, requiring manual coordination for packages and add-ons. This creates inefficiencies in managing reservations, tracking inventory, and processing payments.

## Solution Overview
Build a multi-step booking system with Stripe integration, allowing customers to select dates, packages, and extras with real-time availability management and comprehensive admin controls.

## Technical Stack
- **Platform**: Next.js (existing)
- **Hosting**: Vercel (existing)
- **Authentication**: Auth.js
- **Payments**: Stripe
- **Database**: Railway PostgreSQL with Prisma ORM

## User Stories & Requirements

### Customer Booking Flow

#### Step 1: Date Selection
- Display calendar showing only Fridays and Saturdays
- Show unavailable dates (admin-controlled blackout dates)
- Display cut-off time for each day (default 11pm, admin configurable per day)
- Prevent booking if past cut-off time

#### Step 2: Package Selection
- Display available packages with day-specific pricing
- Show package details and inclusions
- Allow quantity selection for each package
- Support multiple package selection in single booking
- Real-time availability checking (admin can disable packages for specific days)

#### Step 3: Extras Selection
- Display available extras (bottles, guestlists, etc.)
- Show pricing for each extra
- Allow quantity selection
- Real-time availability checking

#### Step 4: Customer Details
- Collect customer information
- Login/signup using Auth.js
- Guest checkout option
- Optional booking notes field (special requests, birthdays, etc.)
- Promo code entry (if applicable)

#### Step 5: Payment
- Apply promo code discounts before payment
- Stripe integration for full payment upfront
- Display order summary with total (including any discounts)
- Process payment securely

#### Step 6: Confirmation
- Generate unique booking reference
- Send email confirmation with booking details
- Display confirmation page
- Schedule automated reminder email for 24hrs before event

### Admin Panel Features

#### Dashboard
- Today's bookings overview
- Revenue summary (daily/weekly/monthly)
- Popular packages analytics
- Quick actions (disable packages, export PDFs)

#### Booking Management
- View all bookings (filterable by date, package, status)
- Edit booking details
- Cancel bookings with automatic Stripe refund processing
- Manual refund button for individual bookings
- Search bookings by customer or reference

#### Availability Management
- Set cut-off times per day (default 11pm)
- Enable/disable specific packages per day
- Set blackout dates (no bookings allowed)
- Emergency "turn off bookings" button for current day
- Real-time inventory control (e.g., disable vodka packages when sold out)

#### Pricing Management
- Set package prices per day
- Different pricing for Friday vs Saturday
- Bulk price updates

#### Promo Code Management
- Create/edit promo codes with percentage or fixed amount discounts
- Set expiry dates and usage limits per code
- Track promo code usage analytics

#### Automated Communications
- Booking confirmation emails
- Automated reminder emails sent 24hrs before event date
- Refund confirmation emails

#### Analytics & Reporting
- Revenue summaries (daily/weekly/monthly)
- Popular packages report
- Customer analytics
- Booking trends

#### PDF Export
- Select specific date for export
- Choose which packages to include in export
- Generate simple checklist format: Email | Package | Extras
- Staff can print and tick off as customers arrive

## Acceptance Criteria

### Customer Experience
- ✓ Customer can only select Fridays and Saturdays
- ✓ Booking prevented if past cut-off time
- ✓ Real-time pricing updates based on selected date
- ✓ Stripe payment processes successfully
- ✓ Email confirmation sent with booking reference
- ✓ Mobile-responsive booking flow
- ✓ Promo codes apply correct discounts during checkout
- ✓ Customer booking notes are captured and visible in admin
- ✓ Automated reminder emails sent 24hrs before events

### Admin Experience
- ✓ Admin can set different cut-off times per day
- ✓ Admin can disable packages for specific days instantly
- ✓ Admin can set blackout dates
- ✓ Admin can edit/cancel existing bookings
- ✓ Admin can process refunds directly through Stripe from admin panel
- ✓ Refund confirmation emails sent to customers
- ✓ PDF export generates correct format with selected packages
- ✓ Analytics dashboard shows revenue and popular packages
- ✓ Admin can create and manage promo codes

### Technical Requirements
- ✓ Integration with existing Next.js/Vercel setup
- ✓ Auth.js authentication working
- ✓ Stripe webhook handling for payment confirmations
- ✓ Database stores all booking, pricing, and availability data
- ✓ Email service integration for confirmations
- ✓ PDF generation library implemented

## Technical Considerations

### Database Schema (suggested tables):
- Users (Auth.js integration)
- Bookings (including notes field)
- Packages
- Extras
- PackagePricing (date-specific)
- Availability (package availability per date)
- BlackoutDates
- PromoCodes
- EmailQueue (for scheduled reminder emails)

### Key Integrations:
- Stripe API for payments and refunds
- Resend for email confirmations and automated reminders
- PDF generation (react-pdf or similar)
- Cron job/scheduler for automated reminder emails

### Timezone & Localization:
- All times displayed and processed in UK timezone (GMT/BST)
- Cut-off times should respect daylight saving time changes
- Date/time formatting should follow UK standards

### Performance:
- Real-time availability checking
- Optimized queries for admin dashboard
- Caching for package pricing

## Priority Level
High Priority - Core revenue feature for business operations

## Estimated Complexity
Large Feature - Multiple integrations, complex state management, admin panel, and real-time availability system

## Success Metrics
- Successful booking completion rate
- Admin efficiency in managing daily operations
- Reduction in manual booking coordination
- Payment processing success rate