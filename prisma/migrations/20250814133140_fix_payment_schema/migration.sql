-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'gbp',
ADD COLUMN     "stripePaymentIntentId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
