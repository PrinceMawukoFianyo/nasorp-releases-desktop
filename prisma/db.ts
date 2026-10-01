import { PrismaClient } from "../generated/prisma-client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

declare global {
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const db =
  globalThis.prisma ||
  new PrismaClient({
    adapter,
    transactionOptions: {
      maxWait: 20000,
      timeout: 55000,
    },
  });
if (process.env.NODE_ENV !== "production") globalThis.prisma = db;