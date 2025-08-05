/*
  Warnings:

  - Added the required column `maxGuests` to the `Package` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Package" ADD COLUMN     "defaultPrice" DOUBLE PRECISION,
ADD COLUMN     "maxGuests" INTEGER NOT NULL;
