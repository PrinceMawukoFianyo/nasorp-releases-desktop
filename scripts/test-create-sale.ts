// scripts/test-create-sale.ts
import { startLocalPostgres, getLocalDb } from "../prisma/db-local";

async function main() {
  await startLocalPostgres();   // ← this line was missing
  const db = getLocalDb();

  const org = await db.organisation.findFirstOrThrow();
  const location = await db.location.findFirstOrThrow({ where: { orgId: org.id } });
  const item = await db.item.findFirstOrThrow({ where: { orgId: org.id } });
  const testUser = await db.user.findFirstOrThrow({ where: { orgId: org.id } });

  console.log("Testing with:");
  console.log("- Org:", org.name);
  console.log("- Location:", location.name);
  console.log("- Item:", item.name);
  console.log("- User:", testUser.email);

  const before = await db.inventory.findUnique({
    where: { itemId_locationId: { itemId: item.id, locationId: location.id } },
  });
  console.log("Stock BEFORE sale:", before?.quantity);

  let customer = await db.customer.findFirst({ where: { orgId: org.id } });
  if (!customer) {
    customer = await db.customer.create({
      data: { orgId: org.id, name: "Walk-in Test Customer" },
    });
  }

  const order = await db.$transaction(async (tx) => {
    const created = await tx.salesOrder.create({
      data: {
        orderNumber: `TEST-${Date.now()}`,
        customerId: customer.id,
        orgId: org.id,
        locationId: location.id,
        createdById: testUser.id,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        subtotal: 10,
        taxAmount: 0,
        lines: {
          create: [{
            itemId: item.id,
            quantity: 1,
            unitPrice: 10,
            taxRate: 0,
            taxAmount: 0,
            total: 10,
            serialNumbers: [],
          }],
        },
      },
    });

    await tx.inventory.update({
      where: { itemId_locationId: { itemId: item.id, locationId: location.id } },
      data: { quantity: { decrement: 1 } },
    });

    return created;
  });

  console.log("Sale created:", order.orderNumber);

  const after = await db.inventory.findUnique({
    where: { itemId_locationId: { itemId: item.id, locationId: location.id } },
  });
  console.log("Stock AFTER sale:", after?.quantity);
}

main().catch(console.error).finally(() => process.exit());