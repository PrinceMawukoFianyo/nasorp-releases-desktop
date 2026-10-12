import { cloudConfigured } from "../lib/cloud-env"; // keep this first
import { app, BrowserWindow, dialog, shell } from "electron";
import { spawn, ChildProcess, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { inspect } from "util";
import { startLocalPostgres, stopLocalPostgres, getLocalRoot } from "../prisma/db-local";
import { pushPendingSalesToCloud, pullChangesFromCloud } from "../lib/sync-engine";
import { autoUpdater } from "electron-updater";


// ───────── file log: <userData>/logs/main.log ─────────
function setupFileLog() {
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "main.log");
    if (fs.existsSync(file) && fs.statSync(file).size > 5_000_000) {
      fs.renameSync(file, path.join(dir, "main.old.log"));
    }
    const stream = fs.createWriteStream(file, { flags: "a" });
    for (const level of ["log", "warn", "error"] as const) {
      const orig = console[level].bind(console);
      console[level] = (...args: any[]) => {
        const text = args
          .map((a) => (typeof a === "string" ? a : inspect(a, { depth: 1 })))
          .join(" ");
        stream.write(`${new Date().toISOString()} [${level}] ${text}\n`);
        orig(...args);
      };
    }
    process.on("uncaughtException", (e) => console.error("uncaughtException:", e));
    process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));
  } catch {}
}
setupFileLog();

console.log("[env check] cloud sync:", cloudConfigured ? "configured" : "not configured (local-only)");
try {
  const u = new URL(process.env.DATABASE_URL ?? "");
  console.log("[env check] DB user:", u.username, "host:", u.hostname);
} catch {
  console.log("[env check] DATABASE_URL is missing or not a valid URL");
}
if (process.env.DATABASE_URL?.includes("localhost")) {
  console.error("⚠️  DATABASE_URL points at localhost, not Neon — a stray shell export is likely overriding cloud.json.");
}

let mainWindow: BrowserWindow;
let nextProcess: ChildProcess | null = null;
const NEXT_PORT = 3000;

// Kills whatever is listening on NEXT_PORT (e.g. an orphan from a crashed session).
function killPort3000() {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${NEXT_PORT}`).toString();
      const pids = new Set(
        output
          .split("\n")
          .filter((l) => l.includes("LISTENING"))
          .map((l) => l.trim().split(/\s+/).pop())
          .filter(Boolean)
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Killed stale process on port ${NEXT_PORT} (PID ${pid})`);
        } catch {}
      }
    } else {
      execSync(`lsof -ti:${NEXT_PORT} | xargs kill -9`);
    }
  } catch {
    // Nothing was listening on the port
  }
}

function killNextProcessTree() {
  if (!nextProcess?.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /T /PID ${nextProcess.pid}`);
    } else {
      nextProcess.kill();
    }
  } catch (err) {
    console.warn("Failed to kill Next.js process tree:", err);
  }
  nextProcess = null;
}

// Runs Next with Electron's own Node, so client PCs don't need Node installed.
function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    let ready = false;
    const appRoot = path.join(__dirname, "../..");

    nextProcess = spawn(
      process.execPath,
      [path.join(appRoot, "node_modules/next/dist/bin/next"), "start", "-p", String(NEXT_PORT)],
      {
        cwd: appRoot,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", IS_DESKTOP_APP: "true" },
      }
    );

    nextProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      console.log("[next]", output);
      if (!ready && output.includes("Ready")) {
        ready = true;
        resolve();
      }
    });

    nextProcess.stderr?.on("data", (data) => console.error("[next:error]", data.toString()));
    nextProcess.on("error", reject);
    nextProcess.on("exit", (code) => {
      if (!ready) reject(new Error(`Next.js server exited early (code ${code})`));
    });

    setTimeout(() => {
      if (!ready) reject(new Error("Next.js server did not start within 60 seconds"));
    }, 60000);
  });
}

function assertDiskSpace(minBytes = 1024 ** 3) {
  let free: number;
  try {
    const root = getLocalRoot();
    fs.mkdirSync(root, { recursive: true });
    const s = fs.statfsSync(root);
    free = s.bavail * s.bsize;
  } catch {
    return; // can't measure, skip the check
  }
  if (free < minBytes) {
    throw new Error(
      `Only ${Math.round(free / 1024 ** 2)} MB free on the drive. Free up at least 1 GB and reopen the app.`
    );
  }
}

// ───────── sync with backoff ─────────
const SYNC_MIN = 30_000;
const SYNC_MAX = 5 * 60_000;
let syncDelay = SYNC_MIN;
let lastSyncError = "";
let syncTimer: NodeJS.Timeout | null = null;
let syncing = false;
let shuttingDown = false;

function briefError(err: any): string {
  const inner = err?.error ?? err;
  const code = inner?.code ?? err?.code;
  const msg = inner?.message ?? err?.message ?? String(err);
  return `${code ? code + ": " : ""}${String(msg).split("\n")[0]}`;
}

function scheduleSync() {
  if (shuttingDown) return;
  syncTimer = setTimeout(syncCycle, syncDelay);
}

async function syncCycle() {
  if (syncing || shuttingDown) return;
  syncing = true;
  try {
    const pushed = await pushPendingSalesToCloud();
    const pulled = await pullChangesFromCloud();
    if (pushed.ordersSynced || pushed.customersSynced || pushed.failures) {
      console.log("[sync]", { pushed, pulled });
    }
    if (lastSyncError) console.log("[sync] back online");
    lastSyncError = "";
    syncDelay = SYNC_MIN;
  } catch (err) {
    const msg = briefError(err);
    if (msg !== lastSyncError) console.error("[sync] cycle failed:", msg);
    lastSyncError = msg;
    syncDelay = Math.min(syncDelay * 2, SYNC_MAX);
  } finally {
    syncing = false;
    scheduleSync();
  }
}

function startSyncLoop() {
  if (!cloudConfigured) {
    console.log("[sync] no cloud config found, running local-only (sales stay pending until configured)");
    return;
  }
  syncCycle(); // runs now, then schedules itself
}

async function shutdown() {
  console.log("Shutting down...");
  if (syncTimer) clearTimeout(syncTimer);
  killNextProcessTree();
  try {
    await stopLocalPostgres();
  } catch (err) {
    console.error("Postgres stop failed:", err);
  }
}

app.whenReady().then(async () => {
  try {
    if (!(await ensureCloudConfig())) return;
    assertDiskSpace();
    killPort3000(); // clean slate before we try to start
    console.log("Starting local Postgres...");
    try {
      await startLocalPostgres();
    } catch (e) {
      throw new Error(
        "Could not start the local database. Check free disk space and that no other copy of the app is running. " +
          (e instanceof Error ? e.message : "")
      );
    }

    console.log("Starting Next.js server...");
    await startNextServer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "Unknown error, see the log");
    console.error("Startup failed:", msg);
    dialog.showErrorBox("Habifazzy Inventory failed to start", msg);
    shuttingDown = true;
    await shutdown();
    app.exit(1);
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "../../build/icon.ico"),
    webPreferences: { contextIsolation: true },
  });

  // Links to other sites open in the normal browser, not inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://localhost:${NEXT_PORT}`)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
  startSyncLoop();
  setupAutoUpdate();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Electron doesn't wait for async handlers, so hold the quit until Postgres is stopped.
app.on("before-quit", (event) => {
  if (shuttingDown) return;
  event.preventDefault();
  shuttingDown = true;
  shutdown().finally(() => app.quit());
});

function setupAutoUpdate() {
  if (!app.isPackaged) return;

  autoUpdater.logger = console;
  autoUpdater.on("error", (err) => console.error("[update] error:", err?.message ?? err));
  autoUpdater.on("update-available", (i) => console.log("[update] downloading", i.version));
  autoUpdater.on("update-downloaded", async (info) => {
    const opts = {
      type: "info" as const,
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      message: `Version ${info.version} is ready to install.`,
      detail: "The app will close and reopen. Finish any sale in progress first.",
    };
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const { response } = await (win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts));
    if (response === 0) {
      shuttingDown = true;
      await shutdown(); // stop Postgres and Next first so the installer can replace files
      autoUpdater.quitAndInstall(true, true);
    }
  });

  const check = () =>
    autoUpdater.checkForUpdates().catch(() => console.log("[update] check skipped (offline?)"));
  check();
  setInterval(check, 4 * 60 * 60 * 1000);
}


async function ensureCloudConfig(): Promise<boolean> {
  if (cloudConfigured || !app.isPackaged) return true;
  const ask = await dialog.showMessageBox({
    type: "question",
    buttons: ["Select cloud.json", "Continue offline"],
    defaultId: 0,
    message: "Cloud settings not found",
    detail: "Choose the cloud.json file you were given. Without it, nobody can sign in on a new PC. The app will restart after copying it.",
  });
  if (ask.response !== 0) return true;
  const pick = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "JSON", extensions: ["json", "txt"] }] });
  if (pick.canceled || !pick.filePaths[0]) return true;
  try {
    const cfg = JSON.parse(fs.readFileSync(pick.filePaths[0], "utf8"));
    new URL(cfg.databaseUrl);
    fs.mkdirSync(getLocalRoot(), { recursive: true });
    fs.copyFileSync(pick.filePaths[0], path.join(getLocalRoot(), "cloud.json"));
    app.relaunch();
    app.exit(0);
    return false;
  } catch {
    dialog.showErrorBox("Invalid cloud.json", "That file isn't a valid cloud.json. Ask for a new copy.");
    return true;
  }
}