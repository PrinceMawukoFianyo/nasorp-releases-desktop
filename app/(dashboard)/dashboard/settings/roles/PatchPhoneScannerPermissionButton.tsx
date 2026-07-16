"use client";
// app/dashboard/settings/roles/PatchPhoneScannerPermissionButton.tsx
//
// Shown on the Roles list page, next to PatchPermissionsButton. One-click
// backfill of pos.phone_scanner onto existing roles that already manage POS.
// Hides itself after a successful run.

import { useState } from "react";
import { patchPhoneScannerPermission } from "@/actions/patch-phone-scanner-permission";
import { Button } from "@/components/ui/button";
import { Smartphone, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export default function PatchPhoneScannerPermissionButton() {
  const [status,    setStatus]    = useState<"idle" | "running" | "done" | "error">("idle");
  const [results,   setResults]   = useState<{ role: string; added: string[]; skipped: string[] }[]>([]);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [expanded,  setExpanded]  = useState(false);

  if (status === "done" && !expanded) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 cursor-pointer" onClick={() => setExpanded(true)}>
        <CheckCircle2 className="h-4 w-4" />
        Phone Scanner permission patched — click to see details
        <ChevronDown className="h-3 w-3" />
      </div>
    );
  }

  async function run() {
    setStatus("running");
    try {
      const res = await patchPhoneScannerPermission();
      if (res.success && res.results) {
        setResults(res.results);
        setStatus("done");
        setExpanded(true);
      } else {
        setErrorMsg(res.error ?? "Unknown error");
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Add Phone Scanner Permission to Existing Roles
            </p>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Run once to add <code className="font-mono">pos.phone_scanner</code> to any role that already
            manages POS, so "Connect Phone Scanner" becomes available for them. Safe to run multiple times.
          </p>
        </div>

        {status === "idle" && (
          <Button size="sm" variant="outline" onClick={run}
            className="border-blue-400 text-blue-800 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900/30">
            Run Patch
          </Button>
        )}

        {status === "running" && (
          <Button size="sm" variant="outline" disabled>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Patching…
          </Button>
        )}

        {status === "error" && (
          <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
        )}
      </div>

      {status === "done" && expanded && (
        <div className="mt-4 space-y-2">
          {results.map((r, i) => (
            <div key={i} className="rounded bg-white dark:bg-slate-900 px-3 py-2 text-xs border border-blue-100 dark:border-blue-900">
              <p className="font-semibold text-foreground">{r.role}</p>
              {r.added.length > 0
                ? <p className="text-emerald-600 mt-0.5">+ Added: {r.added.join(", ")}</p>
                : <p className="text-muted-foreground mt-0.5">Nothing new to add</p>
              }
              {r.skipped.length > 0 && (
                <p className="text-muted-foreground">Already had: {r.skipped.join(", ")}</p>
              )}
            </div>
          ))}
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
            ✅ Refresh your browser — Connect Phone Scanner will now be available on the POS page.
          </p>
          <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
            <ChevronUp className="h-3 w-3" /> Collapse
          </button>
        </div>
      )}
    </div>
  );
}