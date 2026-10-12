import { PrismaClient } from "../generated/prisma-client";
import { LOCAL_URL } from "./local-config";

declare global {
  var localPrisma: PrismaClient | undefined;
}

export function getLocalDb(): PrismaClient {
  if (!globalThis.localPrisma) {
    globalThis.localPrisma = new PrismaClient({
      datasources: { db: { url: LOCAL_URL } },
      transactionOptions: { maxWait: 20000, timeout: 55000 },
    });
  }
  return globalThis.localPrisma;
}