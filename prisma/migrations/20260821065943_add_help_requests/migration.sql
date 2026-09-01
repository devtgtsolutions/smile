-- CreateEnum
CREATE TYPE "HelpStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "help_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "HelpStatus" NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "help_requests_tenant_id_status_idx" ON "help_requests"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
