"use client";
// components/NotificationMenu.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Receives both standard notifications AND MoMo payment alerts.
// MoMo alerts appear with a yellow/gold style at the top.
// Standard alerts use red/amber styling.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertCircle, Bell, Check, Smartphone, Trash, ArrowDownLeft,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

export type MoMoAlert = {
  id: string;
  amount: number;
  senderName: string;
  senderNumber: string;
  message: string;
  timestamp: Date;
  lineNumber: string;
};

export type StandardNotification = {
  id: string;
  status: "WARNING" | "DANGER" | "SUCCESS";
  statusText: string;
  message: string;
};

type AnyNotification =
  | ({ _type: "momo" } & MoMoAlert)
  | ({ _type: "standard" } & StandardNotification);

interface NotificationMenuProps {
  notifications?: StandardNotification[];
  momoAlerts?: MoMoAlert[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n ?? 0);

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GH", { hour: "2-digit", minute: "2-digit", month: "short", day: "2-digit" }).format(d);

export function NotificationMenu({
  notifications = [],
  momoAlerts = [],
}: NotificationMenuProps) {
  const [localMomo, setLocalMomo] = useState<MoMoAlert[]>(momoAlerts);
  const [localStd, setLocalStd]   = useState<StandardNotification[]>(notifications);

  const totalCount = localMomo.length + localStd.length;

  const removeMoMo = (id: string) => {
    setLocalMomo(prev => prev.filter(a => a.id !== id));
    toast.success("Alert dismissed");
  };

  const removeStd = (id: string) => {
    setLocalStd(prev => prev.filter(n => n.id !== id));
    toast.success("Notification removed");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative inline-flex items-center p-2.5 text-sm font-medium text-center rounded-lg">
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          <span className="sr-only">Notifications</span>
          {totalCount > 0 && (
            <div className={cn(
              "absolute inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white rounded-full -top-0.5 -right-0.5",
              localMomo.length > 0 ? "bg-yellow-500" : "bg-red-500"
            )}>
              {totalCount > 9 ? "9+" : totalCount}
            </div>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[380px] sm:w-[460px] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Notifications</h2>
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">{totalCount} unread</span>
            )}
          </div>
        </SheetHeader>

        {totalCount === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 px-5">
            <div className="relative">
              <Bell className="h-16 w-16 text-muted-foreground/20" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-1">No Notifications</h3>
              <p className="text-sm text-muted-foreground">MoMo alerts and system notifications will appear here.</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-2">

              {/* ── MoMo Alerts (always on top, yellow) ── */}
              {localMomo.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 px-1 pt-1">
                    💛 MoMo Payment Alerts
                  </p>
                  {localMomo.map(alert => (
                    <div key={alert.id}
                      className="rounded-xl border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                            <Smartphone className="h-4 w-4 text-yellow-900" />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                              {fmt(alert.amount)} Received
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-400">
                              from {alert.senderName} · {alert.senderNumber}
                            </p>
                          </div>
                        </div>
                        <SheetClose asChild>
                          <button onClick={() => removeMoMo(alert.id)}
                            className="text-xs flex items-center gap-1 text-yellow-700 dark:text-yellow-400 hover:text-red-500 flex-shrink-0">
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </SheetClose>
                      </div>
                      {/* Exact message from phone */}
                      <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg px-3 py-2 text-xs font-mono text-yellow-900 dark:text-yellow-200 leading-relaxed">
                        {alert.message}
                      </div>
                      <p className="text-[10px] text-yellow-600 dark:text-yellow-500 pl-1">
                        Line: {alert.lineNumber} · {fmtTime(alert.timestamp)}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {/* ── Standard Notifications ── */}
              {localStd.length > 0 && (
                <>
                  {localMomo.length > 0 && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pt-2">
                      System Alerts
                    </p>
                  )}
                  {localStd.map(item => {
                    const statusClass =
                      item.status === "WARNING" ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20" :
                      item.status === "DANGER"  ? "border-red-400 bg-red-50 dark:bg-red-950/20" :
                      "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20";
                    const textClass =
                      item.status === "WARNING" ? "text-yellow-700" :
                      item.status === "DANGER"  ? "text-red-600" :
                      "text-emerald-700";
                    const Icon = item.status === "SUCCESS" ? Check : AlertCircle;

                    return (
                      <div key={item.id}
                        className={cn("flex justify-between gap-3 py-3 border-2 items-start px-3 rounded-xl", statusClass)}>
                        <button className={cn(textClass, "mt-0.5")}>
                          <Icon className="w-5 h-5 flex-shrink-0" />
                        </button>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h2 className="text-sm font-bold truncate">{item.statusText}</h2>
                            <SheetClose asChild>
                              <button onClick={() => removeStd(item.id)}
                                className="text-xs flex items-center gap-1 text-red-500 flex-shrink-0">
                                <Trash className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Dismiss</span>
                              </button>
                            </SheetClose>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}