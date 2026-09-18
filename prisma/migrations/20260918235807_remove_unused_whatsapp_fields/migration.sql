/*
  Warnings:

  - A unique constraint covering the columns `[resetToken]` on the table `ClientUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "adminWhatsappNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_resetToken_key" ON "ClientUser"("resetToken");
