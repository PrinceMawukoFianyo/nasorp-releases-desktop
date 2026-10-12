// scripts/pull-from-neon.ts
import { PrismaClient } from "../generated/prisma-client";
import { startLocalPostgres, getLocalDb, stopLocalPostgres } from "../prisma/db-local";

const neonDb = new PrismaClient(); // reads DATABASE_URL from .env

async function copy(label: string, rows: any[], delegate: any) {
  for (const row of rows) {
    await delegate.upsert({ where: { id: row.id }, create: row, update: row });
  }
  console.log(`${label}: ${rows.length}`);
}

async function main() {
  // Guard against the stray-export trap from earlier: refuse to copy local onto itself.
  const [{ port }] = await neonDb.$queryRaw<{ port: number | null }[]>`SELECT inet_server_port() AS port`;
  if (Number(port) === 54329) throw new Error("DATABASE_URL points at LOCAL, not Neon. Aborting.");

  await startLocalPostgres();
  const localDb = getLocalDb();

  // Never overwrite stock while local sales are waiting to sync.
  const pending = await localDb.salesOrder.count({ where: { syncStatus: "pending" } });
  if (pending > 0) throw new Error(`${pending} local sale(s) not synced yet. Sync first, then pull.`);

  let orgId = (await localDb.organisation.findFirst())?.id;
    if (!orgId) {
      const cloudOrg = await neonDb.organisation.findFirstOrThrow();
      await localDb.organisation.upsert({
        where: { id: cloudOrg.id },
        create: cloudOrg,
        update: cloudOrg,
      });
      orgId = cloudOrg.id;
      console.log("Organisation copied from Neon:", orgId);
    }

  await copy("Locations", await neonDb.location.findMany({ where: { orgId } }), localDb.location);

  // Categories can point at a parent, so insert flat first, then link parents.
  const categories = await neonDb.category.findMany({ where: { orgId } });
  await copy("Categories", categories.map((c) => ({ ...c, parentId: null })), localDb.category);
  for (const c of categories.filter((c) => c.parentId)) {
    await localDb.category.update({ where: { id: c.id }, data: { parentId: c.parentId } });
  }

  await copy("Brands", await neonDb.brand.findMany({ where: { orgId } }), localDb.brand);
  await copy("Units", await neonDb.unit.findMany({ where: { orgId } }), localDb.unit);
  await copy("TaxRates", await neonDb.taxRate.findMany({ where: { orgId } }), localDb.taxRate);
  await copy("PackagingUnits", await neonDb.packagingUnit.findMany({ where: { orgId } }), localDb.packagingUnit);
  await copy("Items", await neonDb.item.findMany({ where: { orgId } }), localDb.item);
  await copy("PricingTiers", await neonDb.itemPricingTier.findMany({ where: { item: { orgId } } }), localDb.itemPricingTier);
  await copy("Inventory", await neonDb.inventory.findMany({ where: { orgId } }), localDb.inventory);
    await copy("Suppliers", await neonDb.supplier.findMany({ where: { orgId } }), localDb.supplier);

  const purchaseOrders = await neonDb.purchaseOrder.findMany({ where: { orgId }, include: { lines: true } });
  for (const { lines, ...po } of purchaseOrders) {
    await localDb.purchaseOrder.upsert({ where: { id: po.id }, create: po, update: po });
    for (const line of lines) {
      await localDb.purchaseOrderLine.upsert({ where: { id: line.id }, create: line, update: line });
    }
  }
  console.log("PurchaseOrders:", purchaseOrders.length);

  const manualDebts = await neonDb.manualDebt.findMany({ where: { orgId }, include: { payments: true } });
  for (const { payments, ...debt } of manualDebts) {
    await localDb.manualDebt.upsert({ where: { id: debt.id }, create: debt, update: debt });
    for (const p of payments) {
      await localDb.manualDebtPayment.upsert({ where: { id: p.id }, create: p, update: p });
    }
  }
  console.log("ManualDebts:", manualDebts.length);

  const manualSupplierDebts = await neonDb.manualSupplierDebt.findMany({ where: { orgId }, include: { payments: true } });
  for (const { payments, ...debt } of manualSupplierDebts) {
    await localDb.manualSupplierDebt.upsert({ where: { id: debt.id }, create: debt, update: debt });
    for (const p of payments) {
      await localDb.manualSupplierDebtPayment.upsert({ where: { id: p.id }, create: p, update: p });
    }
  }
  console.log("ManualSupplierDebts:", manualSupplierDebts.length);

  await copy("SupplierPayments", await neonDb.supplierPayment.findMany({ where: { orgId } }), localDb.supplierPayment);

  const goodsReceipts = await neonDb.goodsReceipt.findMany({ where: { orgId }, include: { lines: true } });
  for (const { lines, ...gr } of goodsReceipts) {
    await localDb.goodsReceipt.upsert({ where: { id: gr.id }, create: gr, update: gr });
    for (const line of lines) {
      await localDb.goodsReceiptLine.upsert({ where: { id: line.id }, create: line, update: line });
    }
  }
  console.log("GoodsReceipts:", goodsReceipts.length);

  // Customers: skip any created locally and not yet pushed; mark pulled ones as synced.
  const pendingIds = new Set(
    (await localDb.customer.findMany({ where: { syncStatus: "pending" }, select: { id: true } })).map((c) => c.id)
  );
  const customers = (await neonDb.customer.findMany({ where: { orgId } }))
    .filter((c) => !pendingIds.has(c.id))
    .map((c) => ({ ...c, syncStatus: "synced", syncedAt: new Date() }));
  await copy("Customers", customers, localDb.customer);
}

main()
  .catch(console.error)
  .finally(async () => {
    await neonDb.$disconnect();
    await stopLocalPostgres();
    process.exit();
  });