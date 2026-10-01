import { PrismaClient } from "../generated/prisma-client";
// @ts-ignore - embedded-postgres is ESM-only with no "types" export condition;
// tsc can't resolve its types under some configs. require() works fine at
// runtime on Node 22+. Using @ts-ignore (not @ts-expect-error) since this
// file is type-checked under two different tsconfigs with different results.
import EmbeddedPostgres from "embedded-postgres";
import { LOCAL_PORT, LOCAL_USER, LOCAL_PASSWORD, LOCAL_DB_NAME } from "./local-config";
import path from "path";
import fs from "fs";

declare global {
  var localPrisma: PrismaClient | undefined;
  var localPg: EmbeddedPostgres | undefined;
}

/**
 * Folder that holds all local app data (postgres-data, sync-state.json).
 * - LOCAL_PG_DATA_DIR set  -> its parent folder (so scripts share the app's files)
 * - packaged Electron app  -> Electron's per-user userData folder
 * - dev                    -> <project>/.local-data
 */
export function getLocalRoot(): string {
  if (process.env.LOCAL_PG_DATA_DIR) {
    return path.dirname(process.env.LOCAL_PG_DATA_DIR);
  }
  let base = path.join(process.cwd(), ".local-data");
  try {
    const { app } = require("electron");
    if (app?.isPackaged) base = app.getPath("userData");
  } catch {
    // not running under Electron (e.g. next dev, tsx scripts)
  }
  return base;
}

function resolveDataDir(): string {
  const dir =
    process.env.LOCAL_PG_DATA_DIR || path.join(getLocalRoot(), "postgres-data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const LOCAL_URL = `postgresql://${LOCAL_USER}:${LOCAL_PASSWORD}@localhost:${LOCAL_PORT}/${LOCAL_DB_NAME}`;

// On a brand-new install the database exists but has no tables.
// Apply init.sql (generated from schema.prisma) once, only when it is empty.
async function ensureSchema() {
  const { Client } = require("pg"); // installed as a dependency of embedded-postgres
  const client = new Client({
    host: "localhost",
    port: LOCAL_PORT,
    user: LOCAL_USER,
    password: LOCAL_PASSWORD,
    database: LOCAL_DB_NAME,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'"
    );
    if (rows[0].n === 0) {
      const sqlFile = path.join(__dirname, "init.sql");
      await client.query(fs.readFileSync(sqlFile, "utf8"));
      console.log("[db] schema applied");
    }
  } finally {
    await client.end();
  }
}

export async function startLocalPostgres(): Promise<string> {
  if (!globalThis.localPg) {
    globalThis.localPg = new EmbeddedPostgres({
      databaseDir: resolveDataDir(),
      user: LOCAL_USER,
      password: LOCAL_PASSWORD,
      port: LOCAL_PORT,
      persistent: true,
    });

    const dataDirExists = fs.existsSync(path.join(resolveDataDir(), "PG_VERSION"));
    if (!dataDirExists) {
      await globalThis.localPg.initialise();
    }
    await globalThis.localPg.start();

    try {
      await globalThis.localPg.createDatabase(LOCAL_DB_NAME);
    } catch {
      // already exists — fine
    }

    await ensureSchema();
  }

  return LOCAL_URL;
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

export async function stopLocalPostgres(): Promise<void> {
  if (globalThis.localPrisma) {
    await globalThis.localPrisma.$disconnect();
    globalThis.localPrisma = undefined;
  }
  if (globalThis.localPg) {
    await globalThis.localPg.stop();
    globalThis.localPg = undefined;
  }
}