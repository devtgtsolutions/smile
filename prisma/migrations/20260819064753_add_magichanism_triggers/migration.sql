-- CreateTable
CREATE TABLE "magichanism_triggers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "action_key" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "magichanism_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "magichanism_triggers_tenant_id_action_key_key" ON "magichanism_triggers"("tenant_id", "action_key");

-- AddForeignKey
ALTER TABLE "magichanism_triggers" ADD CONSTRAINT "magichanism_triggers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
