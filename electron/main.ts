import { cloudConfigured } from "../lib/cloud-env"; // keep this first
import { app, BrowserWindow, dialog } from "electron";
import { spawn, ChildProcess, execSync } from "child_process";
import path from "path";
import { startLocalPostgres, stopLocalPostgres } from "../prisma/db-local";
import { pushPendingSalesToCloud, pullChangesFromCloud } from "../lib/sync-engine";

console.log("[env check] cloud sync:", cloudConfigured ? "configured" : "not configured (local-only)");
if (process.env.DATABASE_URL?.includes("localhost")) {
  console.error("⚠️  DATABASE_URL points at localhost, not Neon — a stray shell export is likely overriding .env. Close this terminal and open a fresh one.");
}

let mainWindow: BrowserWindow;
let nextProcess: ChildProcess | null = null;
const NEXT_PORT = 3000;

// Kills whatever is listening on NEXT_PORT, including orphaned processes
// left behind by a previous session's shell-wrapped child (see killNextProcessTree).
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
    // Nothing was listening on the port — fine, nothing to clean up
  }
}

// On Windows, spawn(..., { shell: true }) makes nextProcess a cmd.exe wrapper,
// not the real Next.js process — nextProcess.kill() only kills that wrapper
// and orphans the actual server underneath. /T kills the whole process tree.
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

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    nextProcess = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(NEXT_PORT)], {
      cwd: path.join(__dirname, "../.."),
      env: { ...process.env, IS_DESKTOP_APP: "true" },
      shell: true,
    });

    nextProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      console.log("[next]", output);
      if (output.includes("Ready")) resolve();
    });

    nextProcess.stderr?.on("data", (data) => {
      console.error("[next:error]", data.toString());
    });

    nextProcess.on("error", reject);

    setTimeout(resolve, 15000);
  });
}

let syncTimer: NodeJS.Timeout | null = null;
let syncing = false;

async function syncCycle() {
  if (syncing) return;
  syncing = true;
  try {
    const pushed = await pushPendingSalesToCloud();
    const pulled = await pullChangesFromCloud();
    if (pushed.ordersSynced || pushed.customersSynced || pushed.failures || pulled.pulled) {
      console.log("[sync]", { pushed, pulled });
    }
  } catch (err) {
    console.error("[sync] cycle failed:", err);
  } finally {
    syncing = false;
  }
}

function startSyncLoop() {
  if (!cloudConfigured) {
    console.log("[sync] no cloud config found, running local-only (sales stay pending until configured)");
    return;
  }
  syncCycle(); // first pull right away
  syncTimer = setInterval(syncCycle, 30000);
}

let shuttingDown = false;

async function shutdown() {
  console.log("Shutting down...");
  if (syncTimer) clearInterval(syncTimer);
  killNextProcessTree();
  try {
    await stopLocalPostgres();
  } catch (err) {
    console.error("Postgres stop failed:", err);
  }
}

app.whenReady().then(async () => {
  try {
    killPort3000(); // clean slate before we even try to start

    console.log("Starting local Postgres...");
    await startLocalPostgres();

    console.log("Starting Next.js server...");
    await startNextServer();
  } catch (err) {
    console.error("Startup failed:", err);
    dialog.showErrorBox(
      "Habifazzy Inventory failed to start",
      String((err as Error)?.message ?? err)
    );
    shuttingDown = true;
    await shutdown();
    app.exit(1);
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "../../build/icon.ico"),
    webPreferences: {
      contextIsolation: true,
    },
  });
  mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
  startSyncLoop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Electron doesn't wait for async handlers, so hold the quit until Postgres is stopped.
app.on("before-quit", (event) => {
  if (shuttingDown) return;
  event.preventDefault();
  shuttingDown = true;
  shutdown().finally(() => app.exit(0));
});