import { PrismaClient } from "../generated/prisma-client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { getLocalDb } from "./local-client";

neonConfig.webSocketConstructor = ws;

declare global {
  var prisma: PrismaClient | undefined;
}

function createNeonClient(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 20000, timeout: 55000 },
  });
}

// Desktop build: the Next.js server talks to the local Postgres only.
// Web (Vercel, npm run dev) and the Electron sync engine: Neon, as before.
const isDesktopServer = process.env.IS_DESKTOP_APP === "true";

export const db: PrismaClient = isDesktopServer
  ? getLocalDb()
  : globalThis.prisma || createNeonClient();

if (!isDesktopServer && process.env.NODE_ENV !== "production") globalThis.prisma = db;