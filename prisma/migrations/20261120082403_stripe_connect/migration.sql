-- AlterTable
ALTER TABLE "Slot" ADD COLUMN "heldUntil" DATETIME;

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "totalPaid" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "reference" TEXT NOT NULL,
    "paymentRef" TEXT,
    "checkoutSessionId" TEXT,
    "chargeId" TEXT,
    "commission" INTEGER NOT NULL DEFAULT 0,
    "businessAmount" INTEGER NOT NULL DEFAULT 0,
    "payoutStatus" TEXT NOT NULL DEFAULT 'NOT_DUE',
    "transferId" TEXT,
    "payoutError" TEXT,
    "paidOutAt" DATETIME,
    "refundStatus" TEXT NOT NULL DEFAULT 'NONE',
    "refundedAmount" INTEGER NOT NULL DEFAULT 0,
    "refundId" TEXT,
    "disputeStatus" TEXT,
    "cancelledBy" TEXT,
    "cancelledAt" DATETIME,
    "completedAt" DATETIME,
    "autoCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "id", "paymentRef", "reference", "slotId", "status", "totalPaid", "userId") SELECT "createdAt", "id", "paymentRef", "reference", "slotId", "status", "totalPaid", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");
CREATE UNIQUE INDEX "Booking_checkoutSessionId_key" ON "Booking"("checkoutSessionId");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "Booking_slotId_idx" ON "Booking"("slotId");
CREATE INDEX "Booking_status_payoutStatus_idx" ON "Booking"("status", "payoutStatus");
CREATE TABLE "new_Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL,
    "postcode" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL DEFAULT '',
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "logoUrl" TEXT,
    "phone" TEXT,
    "openingHours" TEXT NOT NULL DEFAULT '{}',
    "ratingAvg" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "stripeAccountId" TEXT,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeStatusCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Business" ("address", "area", "createdAt", "description", "id", "lat", "lng", "logoUrl", "name", "openingHours", "ownerId", "phone", "postcode", "ratingAvg", "ratingCount", "slug", "type") SELECT "address", "area", "createdAt", "description", "id", "lat", "lng", "logoUrl", "name", "openingHours", "ownerId", "phone", "postcode", "ratingAvg", "ratingCount", "slug", "type" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
CREATE UNIQUE INDEX "Business_stripeAccountId_key" ON "Business"("stripeAccountId");
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
