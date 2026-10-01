import { getLocalDb, startLocalPostgres } from "../prisma/db-local";

async function main() {
  await startLocalPostgres();
  const db = getLocalDb();

  const deletedLines = await db.salesOrderLine.deleteMany({
    where: { salesOrders: { orderNumber: { startsWith: "TEST-" } } },
  });
  console.log("Deleted test order lines:", deletedLines.count);

  const deletedOrders = await db.salesOrder.deleteMany({
    where: { orderNumber: { startsWith: "TEST-" } },
  });
  console.log("Deleted test orders:", deletedOrders.count);

  const deletedCust = await db.customer.deleteMany({
    where: { name: "Walk-in Test Customer" },
  });
  console.log("Deleted test customer:", deletedCust.count);
}

main().catch(console.error).finally(() => process.exit());