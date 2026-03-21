"use client";
// app/dashboard/settings/roles/PatchPermissionsButton.tsx
//
// Shown on the Roles list page. Lets the admin add accounting permissions
// to all existing DB roles with one click — no separate route needed.
// Hides itself after a successful run.

import { useState } from "react";
import { patchAccountingPermissions } from "@/actions/roles";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export default function PatchPermissionsButton() {
  const [status,    setStatus]    = useState<"idle" | "running" | "done" | "error">("idle");
  const [results,   setResults]   = useState<{ role: string; added: string[]; skipped: string[] }[]>([]);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [expanded,  setExpanded]  = useState(false);

  if (status === "done" && !expanded) {
    // Collapsed success state — small green tick
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 cursor-pointer" onClick={() => setExpanded(true)}>
        <CheckCircle2 className="h-4 w-4" />
        Accounting permissions patched — click to see details
        <ChevronDown className="h-3 w-3" />
      </div>
    );
  }

  async function run() {
    setStatus("running");
    try {
      const res = await patchAccountingPermissions();
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
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Add Accounting Permissions to Existing Roles
            </p>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Run once to add <code className="font-mono">accounting.read</code> (and related) to all roles
            so the Accounting sidebar entry becomes visible. Safe to run multiple times.
          </p>
        </div>

        {status === "idle" && (
          <Button size="sm" variant="outline" onClick={run}
            className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/30">
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

      {/* Results */}
      {status === "done" && expanded && (
        <div className="mt-4 space-y-2">
          {results.map((r, i) => (
            <div key={i} className="rounded bg-white dark:bg-slate-900 px-3 py-2 text-xs border border-amber-100 dark:border-amber-900">
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
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            ✅ Refresh your browser — Accounting will now appear in the sidebar.
          </p>
          <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
            <ChevronUp className="h-3 w-3" /> Collapse
          </button>
        </div>
      )}
    </div>
  );
}