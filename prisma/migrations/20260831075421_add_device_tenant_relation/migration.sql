/*
  Warnings:

  - You are about to drop the `devices` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DeviceRole" AS ENUM ('MAIN', 'BUZZER');

-- DropForeignKey
ALTER TABLE "devices" DROP CONSTRAINT "devices_tenant_id_fkey";

-- DropTable
DROP TABLE "devices";

-- CreateTable
CREATE TABLE "Device" (
    "deviceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "role" "DeviceRole" NOT NULL,
    "playerNumber" INTEGER,
    "color" TEXT,
    "name" TEXT,
    "type" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("deviceId")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "role" "DeviceRole" NOT NULL,
    "playerNumber" INTEGER,
    "color" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Device_tenantId_room_idx" ON "Device"("tenantId", "room");

-- CreateIndex
CREATE UNIQUE INDEX "Device_tenantId_room_role_playerNumber_key" ON "Device"("tenantId", "room", "role", "playerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
