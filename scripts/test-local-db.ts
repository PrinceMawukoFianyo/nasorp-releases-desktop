// scripts/test-local-db.ts

import { getLocalDb, startLocalPostgres } from "../prisma/db-local";


async function main() {
  const url = await startLocalPostgres();
  console.log("Local Postgres running at:", url);

  const db = getLocalDb();
  const orgs = await db.organisation.findMany();
  console.log("Query succeeded. Organisations found:", orgs.length);
}

main().catch(console.error);