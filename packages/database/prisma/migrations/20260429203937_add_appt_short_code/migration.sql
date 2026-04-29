-- AlterTable: agregar contador de citas al tenant (códigos cortos 1-999)
ALTER TABLE "Tenant" ADD COLUMN "apptCounter" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: agregar código corto a citas
ALTER TABLE "Appointment" ADD COLUMN "shortCode" INTEGER;

-- CreateIndex: unicidad de shortCode por tenant
CREATE UNIQUE INDEX "Appointment_tenantId_shortCode_key" ON "Appointment"("tenantId", "shortCode");
