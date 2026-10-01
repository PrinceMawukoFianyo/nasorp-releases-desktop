import { PrismaClient } from "../generated/prisma-client";
import { db } from "./db";
import { LOCAL_URL } from "./local-config";

declare global {
  var authLocalPrisma: PrismaClient | undefined;
}

function localClient(): PrismaClient {
  if (!globalThis.authLocalPrisma) {
    globalThis.authLocalPrisma = new PrismaClient({ datasources: { db: { url: LOCAL_URL } } });
  }
  return globalThis.authLocalPrisma;
}

// Desktop build: authenticate against the local database. Web/dev: unchanged (Neon).
export const authDb: PrismaClient =
  process.env.IS_DESKTOP_APP === "true" ? localClient() : db;