import fs from "fs";
import path from "path";
import { db as neonDb } from "../prisma/db";
import { getLocalDb, getLocalRoot } from "../prisma/db-local";

function stockStatusFor(qty: number): "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK" {
  return qty <= 0 ? "OUT_OF_STOCK" : qty < 10 ? "LOW_STOCK" : "IN_STOCK";
}

// ───────────────────────── PUSH: local → Neon ─────────────────────────
export async function pushPendingSalesToCloud() {
  const localDb = getLocalDb();
  let customersSynced = 0;
  let ordersSynced = 0;
  let failures = 0;

  // Customers first (orders reference them)
  const pendingCustomers = await localDb.customer.findMany({ where: { syncStatus: "pending" } });
  for (const customer of pendingCustomers) {
    try {
      const { syncStatus, syncedAt, ...data } = customer;
      await neonDb.customer.upsert({ where: { id: customer.id }, create: data, update: data });
      await localDb.customer.update({
        where: { id: customer.id },
        data: { syncStatus: "synced", syncedAt: new Date() },
      });
      customersSynced++;
    } catch (err) {
      console.error("[sync] customer failed, will retry:", customer.id, err);
      failures++;
    }
  }

  // Expenses
  const pendingExpenses = await localDb.expense.findMany({ where: { syncStatus: "pending" } });
  for (const exp of pendingExpenses) {
    try {
      const { syncStatus, syncedAt, ...data } = exp;
      await neonDb.expense.upsert({ where: { id: exp.id }, create: data, update: data });
      await localDb.expense.update({ where: { id: exp.id }, data: { syncStatus: "synced", syncedAt: new Date() } });
    } catch (err) {
      console.error("[sync] expense failed, will retry:", exp.id, err);
      failures++;
    }
  }

  // Payroll entries
  const pendingPayroll = await localDb.payrollEntry.findMany({ where: { syncStatus: "pending" } });
  for (const entry of pendingPayroll) {
    try {
      const { syncStatus, syncedAt, ...data } = entry;
      await neonDb.payrollEntry.upsert({ where: { id: entry.id }, create: data, update: data });
      await localDb.payrollEntry.update({ where: { id: entry.id }, data: { syncStatus: "synced", syncedAt: new Date() } });
    } catch (err) {
      console.error("[sync] payroll entry failed, will retry:", entry.id, err);
      failures++;
    }
  }

  // Sales, oldest first
  const pendingOrders = await localDb.salesOrder.findMany({
    where: { syncStatus: "pending" },
    include: { lines: true },
    orderBy: { createdAt: "asc" },
  });

  for (const order of pendingOrders) {
    try {
      const { syncStatus, syncedAt, lines, ...orderData } = order;

      const alreadyInCloud = await neonDb.salesOrder.findUnique({
        where: { id: order.id },
        select: { id: true },
      });

      if (!alreadyInCloud) {
        // The stock movements this sale actually made (right location, right quantity)
        const movements = await localDb.inventoryTransaction.findMany({
          where: { referenceNumber: order.orderNumber },
        });

        await neonDb.$transaction(
          async (tx) => {
            await tx.salesOrder.create({
              data: {
                ...orderData,
                lines: { create: lines.map(({ salesOrderId, ...l }: any) => l) },
              },
            });

            for (const m of movements) {
              await tx.inventoryTransaction.create({ data: m });

              // m.quantity is negative for a sale, so increment lowers stock
              await tx.inventory.updateMany({
                where: { itemId: m.itemId, locationId: m.locationId, orgId: m.orgId },
                data: { quantity: { increment: m.quantity } },
              });

              const inv = await tx.inventory.findFirst({
                where: { itemId: m.itemId, locationId: m.locationId, orgId: m.orgId },
              });
              if (inv) {
                await tx.inventory.update({
                  where: { id: inv.id },
                  data: { stockStatus: stockStatusFor(inv.quantity) },
                });
              }
            }

            for (const line of lines) {
              await tx.item.update({
                where: { id: line.itemId },
                data: {
                  salesCount: { increment: line.quantity },
                  salesTotal: { increment: line.total },
                },
              });
            }
          },
          { maxWait: 20000, timeout: 55000 }
        );
      }

      await localDb.salesOrder.update({
        where: { id: order.id },
        data: { syncStatus: "synced", syncedAt: new Date() },
      });
      ordersSynced++;
    } catch (err) {
      console.error("[sync] order failed, will retry:", order.id, err);
      failures++;
    }
  }

  return { customersSynced, ordersSynced, failures };
}

// ───────────────────────── PULL: Neon → local ─────────────────────────
const OVERLAP_MS = 2 * 60 * 1000;

// Resolved lazily so it follows the same folder as the local database
// (userData when packaged, .local-data in dev).
function getStateFile(): string {
  return path.join(getLocalRoot(), "sync-state.json");
}

function readState(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(getStateFile(), "utf8"));
  } catch {
    return {};
  }
}

function writeState(state: Record<string, string>) {
  const file = getStateFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
}

export async function pullChangesFromCloud() {
  const localDb = getLocalDb();

  // Never touch stock while local sales are waiting to be pushed.
  const pending = await localDb.salesOrder.count({ where: { syncStatus: "pending" } });
  if (pending > 0) return { skipped: true, pulled: 0 };

  // A fresh local database has no organisation yet: copy it down from Neon first.
  let orgId = (await localDb.organisation.findFirst())?.id;
  if (!orgId) {
    const cloudOrg = await neonDb.organisation.findFirstOrThrow();
    await localDb.organisation.upsert({
      where: { id: cloudOrg.id },
      create: cloudOrg,
      update: cloudOrg,
    });
    orgId = cloudOrg.id;
  }

  const state = readState();
  const seen = (name: string) => new Date(new Date(state[name] ?? 0).getTime() - OVERLAP_MS);
  let pulled = 0;

  // `field` is the timestamp column the query filters on, so the saved marker
  // always matches what the next query compares against.
  async function run(
    name: string,
    rows: any[],
    save: (rows: any[]) => Promise<void>,
    field: string = "updatedAt"
  ) {
    if (rows.length === 0) return;
    await save(rows);
    state[name] = rows
      .reduce((m, r) => (r[field] > m ? r[field] : m), new Date(0))
      .toISOString();
    pulled += rows.length;
  }

  const upsertAll = (delegate: any) => async (rows: any[]) => {
    for (const r of rows) await delegate.upsert({ where: { id: r.id }, create: r, update: r });
  };

  await run("location",
    await neonDb.location.findMany({ where: { orgId, updatedAt: { gt: seen("location") } } }),
    upsertAll(localDb.location));

  await run("category",
    await neonDb.category.findMany({ where: { orgId, updatedAt: { gt: seen("category") } } }),
    async (rows) => {
      await upsertAll(localDb.category)(rows.map((r) => ({ ...r, parentId: null })));
      for (const r of rows.filter((r) => r.parentId)) {
        await localDb.category.update({ where: { id: r.id }, data: { parentId: r.parentId } });
      }
    });

  await run("brand",
    await neonDb.brand.findMany({ where: { orgId, updatedAt: { gt: seen("brand") } } }),
    upsertAll(localDb.brand));
  await run("unit",
    await neonDb.unit.findMany({ where: { orgId, updatedAt: { gt: seen("unit") } } }),
    upsertAll(localDb.unit));
  await run("taxRate",
    await neonDb.taxRate.findMany({ where: { orgId, updatedAt: { gt: seen("taxRate") } } }),
    upsertAll(localDb.taxRate));
  await run("packagingUnit",
    await neonDb.packagingUnit.findMany({ where: { orgId, updatedAt: { gt: seen("packagingUnit") } } }),
    upsertAll(localDb.packagingUnit));
  await run("item",
    await neonDb.item.findMany({ where: { orgId, updatedAt: { gt: seen("item") } } }),
    upsertAll(localDb.item));
  await run("pricingTier",
    await neonDb.itemPricingTier.findMany({ where: { item: { orgId }, updatedAt: { gt: seen("pricingTier") } } }),
    upsertAll(localDb.itemPricingTier));
  await run("inventory",
    await neonDb.inventory.findMany({ where: { orgId, updatedAt: { gt: seen("inventory") } } }),
    upsertAll(localDb.inventory));

  const pendingCustomerIds = new Set(
    (await localDb.customer.findMany({ where: { syncStatus: "pending" }, select: { id: true } })).map((c) => c.id)
  );
  await run("customer",
    (await neonDb.customer.findMany({ where: { orgId, updatedAt: { gt: seen("customer") } } }))
      .filter((c) => !pendingCustomerIds.has(c.id))
      .map((c) => ({ ...c, syncStatus: "synced", syncedAt: new Date() })),
    upsertAll(localDb.customer));

  await run("expense",
    await neonDb.expense.findMany({ where: { orgId, date: { gt: seen("expense") } } }),
    upsertAll(localDb.expense),
    "date");

  await run("payrollEntry",
    await neonDb.payrollEntry.findMany({ where: { orgId, date: { gt: seen("payrollEntry") } } }),
    upsertAll(localDb.payrollEntry),
    "date");

  // Users and roles are small, so pull them in full every cycle (login works offline).
  const cloudRoles = await neonDb.role.findMany();
  await upsertAll(localDb.role)(cloudRoles);
  pulled += cloudRoles.length;

  const cloudUsers = await neonDb.user.findMany({
    where: { orgId },
    include: { roles: { select: { id: true } } },
  });
  for (const { roles, ...u } of cloudUsers) {
    await localDb.user.upsert({ where: { id: u.id }, create: u, update: u });
    await localDb.user.update({
      where: { id: u.id },
      data: { roles: { set: roles.map((r) => ({ id: r.id })) } },
    });
  }
  pulled += cloudUsers.length;

  writeState(state);
  return { skipped: false, pulled };
}