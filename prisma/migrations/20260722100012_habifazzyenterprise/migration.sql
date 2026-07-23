-- DropForeignKey
ALTER TABLE "Adjustment" DROP CONSTRAINT "Adjustment_locationId_fkey";

-- AlterTable
ALTER TABLE "Adjustment" ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AdjustmentLine" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "default_location_id" TEXT;

-- CreateTable
CREATE TABLE "ManualDebt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountOwing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "ManualDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualDebtPayment" (
    "id" TEXT NOT NULL,
    "manualDebtId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "ManualDebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualSupplierDebt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amountOwing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualSupplierDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualSupplierDebtPayment" (
    "id" TEXT NOT NULL,
    "manualSupplierDebtId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "ManualSupplierDebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomoLine" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomoLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomoTransaction" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net" DECIMAL(12,2) NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT,
    "toBank" TEXT,
    "toAccount" TEXT,
    "toName" TEXT,
    "lineId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "message" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "paystackRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomoTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomoAlert" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomoAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgSmsBalance" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "creditBalanceUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "creditUsedUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "atCostOwedUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "profitAccruedUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "bundleSmssUsed" INTEGER NOT NULL DEFAULT 0,
    "bundleSmssLimit" INTEGER NOT NULL DEFAULT 1000,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgSmsBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsUsage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "smsBalanceId" TEXT,
    "smsCount" INTEGER NOT NULL DEFAULT 1,
    "atCostUsd" DECIMAL(10,6) NOT NULL,
    "platformProfitUsd" DECIMAL(10,6) NOT NULL,
    "merchantChargeUsd" DECIMAL(10,6) NOT NULL,
    "billedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "SmsUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCreditTopup" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "smsBalanceId" TEXT,
    "amountUsd" DECIMAL(10,4) NOT NULL,
    "smsCreditCount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "paystackRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsCreditTopup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaystackSplitConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "splitCode" TEXT NOT NULL,
    "splitId" TEXT,
    "superAdminSubaccount" TEXT NOT NULL,
    "businessSubaccount" TEXT NOT NULL,
    "superAdminSharePct" DECIMAL(5,2) NOT NULL,
    "businessSharePct" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaystackSplitConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "planFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "smsFee" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "totalAmountUsd" DECIMAL(10,2) NOT NULL,
    "totalAmountGhs" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "deductionMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "amountGhs" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "paystackRef" TEXT,
    "momoRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanSession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "stationLabel" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "joinedByUserId" TEXT,
    "joinedByName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualDebt_orgId_idx" ON "ManualDebt"("orgId");

-- CreateIndex
CREATE INDEX "ManualDebt_customerId_idx" ON "ManualDebt"("customerId");

-- CreateIndex
CREATE INDEX "ManualDebt_status_idx" ON "ManualDebt"("status");

-- CreateIndex
CREATE INDEX "ManualDebtPayment_manualDebtId_idx" ON "ManualDebtPayment"("manualDebtId");

-- CreateIndex
CREATE INDEX "ManualDebtPayment_orgId_idx" ON "ManualDebtPayment"("orgId");

-- CreateIndex
CREATE INDEX "ManualSupplierDebt_orgId_idx" ON "ManualSupplierDebt"("orgId");

-- CreateIndex
CREATE INDEX "ManualSupplierDebt_supplierId_idx" ON "ManualSupplierDebt"("supplierId");

-- CreateIndex
CREATE INDEX "ManualSupplierDebt_status_idx" ON "ManualSupplierDebt"("status");

-- CreateIndex
CREATE INDEX "ManualSupplierDebtPayment_manualSupplierDebtId_idx" ON "ManualSupplierDebtPayment"("manualSupplierDebtId");

-- CreateIndex
CREATE INDEX "ManualSupplierDebtPayment_orgId_idx" ON "ManualSupplierDebtPayment"("orgId");

-- CreateIndex
CREATE INDEX "MomoLine_orgId_idx" ON "MomoLine"("orgId");

-- CreateIndex
CREATE INDEX "MomoLine_number_idx" ON "MomoLine"("number");

-- CreateIndex
CREATE UNIQUE INDEX "MomoTransaction_reference_key" ON "MomoTransaction"("reference");

-- CreateIndex
CREATE INDEX "MomoTransaction_orgId_idx" ON "MomoTransaction"("orgId");

-- CreateIndex
CREATE INDEX "MomoTransaction_createdAt_idx" ON "MomoTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "MomoTransaction_status_idx" ON "MomoTransaction"("status");

-- CreateIndex
CREATE INDEX "MomoTransaction_type_idx" ON "MomoTransaction"("type");

-- CreateIndex
CREATE INDEX "MomoAlert_orgId_idx" ON "MomoAlert"("orgId");

-- CreateIndex
CREATE INDEX "MomoAlert_delivered_idx" ON "MomoAlert"("delivered");

-- CreateIndex
CREATE INDEX "MomoAlert_createdAt_idx" ON "MomoAlert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "OrgSmsBalance_orgId_key" ON "OrgSmsBalance"("orgId");

-- CreateIndex
CREATE INDEX "OrgSmsBalance_orgId_idx" ON "OrgSmsBalance"("orgId");

-- CreateIndex
CREATE INDEX "SmsUsage_orgId_idx" ON "SmsUsage"("orgId");

-- CreateIndex
CREATE INDEX "SmsUsage_billedAt_idx" ON "SmsUsage"("billedAt");

-- CreateIndex
CREATE INDEX "SmsUsage_status_idx" ON "SmsUsage"("status");

-- CreateIndex
CREATE INDEX "SmsCreditTopup_orgId_idx" ON "SmsCreditTopup"("orgId");

-- CreateIndex
CREATE INDEX "SmsCreditTopup_createdAt_idx" ON "SmsCreditTopup"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackSplitConfig_orgId_key" ON "PaystackSplitConfig"("orgId");

-- CreateIndex
CREATE INDEX "PaystackSplitConfig_orgId_idx" ON "PaystackSplitConfig"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_invoiceNumber_key" ON "BillingInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BillingInvoice_orgId_idx" ON "BillingInvoice"("orgId");

-- CreateIndex
CREATE INDEX "BillingInvoice_status_idx" ON "BillingInvoice"("status");

-- CreateIndex
CREATE INDEX "BillingInvoice_dueDate_idx" ON "BillingInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "BillingPayment_invoiceId_idx" ON "BillingPayment"("invoiceId");

-- CreateIndex
CREATE INDEX "BillingPayment_orgId_idx" ON "BillingPayment"("orgId");

-- CreateIndex
CREATE INDEX "BillingPayment_status_idx" ON "BillingPayment"("status");

-- CreateIndex
CREATE INDEX "ScanSession_code_orgId_idx" ON "ScanSession"("code", "orgId");

-- CreateIndex
CREATE INDEX "ScanSession_orgId_status_idx" ON "ScanSession"("orgId", "status");

-- CreateIndex
CREATE INDEX "ScanEvent_sessionId_seq_idx" ON "ScanEvent"("sessionId", "seq");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_default_location_id_fkey" FOREIGN KEY ("default_location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentLine" ADD CONSTRAINT "AdjustmentLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDebt" ADD CONSTRAINT "ManualDebt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDebt" ADD CONSTRAINT "ManualDebt_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDebtPayment" ADD CONSTRAINT "ManualDebtPayment_manualDebtId_fkey" FOREIGN KEY ("manualDebtId") REFERENCES "ManualDebt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDebtPayment" ADD CONSTRAINT "ManualDebtPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSupplierDebt" ADD CONSTRAINT "ManualSupplierDebt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSupplierDebt" ADD CONSTRAINT "ManualSupplierDebt_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSupplierDebtPayment" ADD CONSTRAINT "ManualSupplierDebtPayment_manualSupplierDebtId_fkey" FOREIGN KEY ("manualSupplierDebtId") REFERENCES "ManualSupplierDebt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSupplierDebtPayment" ADD CONSTRAINT "ManualSupplierDebtPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomoLine" ADD CONSTRAINT "MomoLine_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomoTransaction" ADD CONSTRAINT "MomoTransaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomoTransaction" ADD CONSTRAINT "MomoTransaction_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "MomoLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgSmsBalance" ADD CONSTRAINT "OrgSmsBalance_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsUsage" ADD CONSTRAINT "SmsUsage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsUsage" ADD CONSTRAINT "SmsUsage_smsBalanceId_fkey" FOREIGN KEY ("smsBalanceId") REFERENCES "OrgSmsBalance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCreditTopup" ADD CONSTRAINT "SmsCreditTopup_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCreditTopup" ADD CONSTRAINT "SmsCreditTopup_smsBalanceId_fkey" FOREIGN KEY ("smsBalanceId") REFERENCES "OrgSmsBalance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaystackSplitConfig" ADD CONSTRAINT "PaystackSplitConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScanSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
