-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentError" TEXT,
ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentStatus" TEXT;
