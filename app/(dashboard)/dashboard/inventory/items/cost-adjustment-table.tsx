// Target path: components/dashboard/items/cost-adjustment-table.tsx (replaces earlier version)
//
// Adds: per-row Save button, and a "History" button per row that opens a
// dialog listing the last 20 price changes for that item.
// Assumes shadcn/ui Dialog is available at "@/components/ui/dialog".

"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, RotateCcw, Search, History, Loader2 } from "lucide-react";
import {
  bulkUpdateItemCostAndPrice,
  getPriceAdjustmentHistory,
  type CostAdjustmentItem,
  type PriceAdjustmentHistoryEntry,
} from "@/actions/cost-adjustment";

interface CostAdjustmentTableProps {
  initialItems: CostAdjustmentItem[];
}

interface EditableRow extends CostAdjustmentItem {
  draftCost: number;
  draftSelling: number;
  isSavingRow?: boolean;
}

export function CostAdjustmentTable({ initialItems }: CostAdjustmentTableProps) {
  const [rows, setRows] = useState<EditableRow[]>(
    initialItems.map((i) => ({
      ...i,
      draftCost: i.costPrice,
      draftSelling: i.sellingPrice,
    }))
  );
  const [showSelling, setShowSelling] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // History dialog state
  const [historyItem, setHistoryItem] = useState<{ id: string; name: string } | null>(null);
  const [historyEntries, setHistoryEntries] = useState<PriceAdjustmentHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const dirtyRows = useMemo(
    () => rows.filter((r) => r.draftCost !== r.costPrice || r.draftSelling !== r.sellingPrice),
    [rows]
  );

  function updateDraft(id: string, field: "draftCost" | "draftSelling", value: string) {
    const num = value === "" ? 0 : Number(value);
    if (Number.isNaN(num)) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: num } : r)));
  }

  function resetRow(id: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, draftCost: r.costPrice, draftSelling: r.sellingPrice } : r
      )
    );
  }

  function resetAll() {
    setRows((prev) => prev.map((r) => ({ ...r, draftCost: r.costPrice, draftSelling: r.sellingPrice })));
  }

  // Shared save routine — pass either every dirty row or a single row.
  function saveRows(toSave: EditableRow[]) {
    if (toSave.length === 0) {
      toast.info("No changes to save");
      return;
    }

    const ids = new Set(toSave.map((r) => r.id));
    if (toSave.length === 1) {
      setRows((prev) => prev.map((r) => (r.id === toSave[0].id ? { ...r, isSavingRow: true } : r)));
    }

    startTransition(async () => {
      const updates = toSave.map((r) => ({
        itemId: r.id,
        costPrice: r.draftCost,
        sellingPrice: r.draftSelling,
      }));

      const res = await bulkUpdateItemCostAndPrice(updates);

      if (res.success) {
        toast.success(`Updated ${res.updated} item${res.updated === 1 ? "" : "s"}`);
        setRows((prev) =>
          prev.map((r) =>
            ids.has(r.id)
              ? { ...r, costPrice: r.draftCost, sellingPrice: r.draftSelling, isSavingRow: false }
              : r
          )
        );
      } else {
        toast.error(res.error || "Failed to save changes");
        setRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, isSavingRow: false } : r)));
      }
    });
  }

  async function openHistory(item: EditableRow) {
    setHistoryItem({ id: item.id, name: item.name });
    setHistoryLoading(true);
    setHistoryEntries([]);
    const res = await getPriceAdjustmentHistory(item.id);
    setHistoryEntries(res.success ? res.data : []);
    setHistoryLoading(false);
  }

  const currency = (n: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Cost Adjustment</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} items
            {dirtyRows.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {dirtyRows.length} unsaved change{dirtyRows.length === 1 ? "" : "s"}
              </Badge>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox checked={showSelling} onCheckedChange={(v) => setShowSelling(!!v)} />
            Also edit selling price
          </label>

          {dirtyRows.length > 0 && (
            <Button variant="outline" size="sm" onClick={resetAll} disabled={isPending}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset all
            </Button>
          )}

          <Button size="sm" onClick={() => saveRows(dirtyRows)} disabled={isPending || dirtyRows.length === 0}>
            <Save className="h-4 w-4 mr-1" />
            {isPending ? "Saving..." : `Save all${dirtyRows.length ? ` (${dirtyRows.length})` : ""}`}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Current Cost</TableHead>
                <TableHead>New Cost</TableHead>
                {showSelling && (
                  <>
                    <TableHead>Current Selling</TableHead>
                    <TableHead>New Selling</TableHead>
                  </>
                )}
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showSelling ? 7 : 5} className="text-center py-8 text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              )}

              {filteredRows.map((row) => {
                const isDirty = row.draftCost !== row.costPrice || row.draftSelling !== row.sellingPrice;

                return (
                  <TableRow key={row.id} className={isDirty ? "bg-amber-50" : undefined}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{row.sku}</TableCell>
                    <TableCell className="text-muted-foreground">{currency(row.costPrice)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.draftCost}
                        onChange={(e) => updateDraft(row.id, "draftCost", e.target.value)}
                        className="w-28"
                      />
                    </TableCell>

                    {showSelling && (
                      <>
                        <TableCell className="text-muted-foreground">{currency(row.sellingPrice)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.draftSelling}
                            onChange={(e) => updateDraft(row.id, "draftSelling", e.target.value)}
                            className="w-28"
                          />
                        </TableCell>
                      </>
                    )}

                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isDirty && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => saveRows([row])}
                              disabled={isPending}
                            >
                              {row.isSavingRow ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => resetRow(row.id)} disabled={isPending}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openHistory(row)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!historyItem} onOpenChange={(open) => !open && setHistoryItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Price history — {historyItem?.name}</DialogTitle>
          </DialogHeader>

          {historyLoading && (
            <div className="py-8 flex justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!historyLoading && historyEntries.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No price changes recorded yet.
            </p>
          )}

          {!historyLoading && historyEntries.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {historyEntries.map((h) => (
                <div key={h.id} className="text-sm border-b pb-2 last:border-none">
                  <div className="flex justify-between text-muted-foreground text-xs mb-1">
                    <span>{h.userEmail || "Unknown user"}</span>
                    <span>{new Date(h.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    Cost: {currency(h.previousCostPrice)} → <span className="font-medium">{currency(h.newCostPrice)}</span>
                  </div>
                  {h.previousSellingPrice !== h.newSellingPrice && (
                    <div>
                      Selling: {currency(h.previousSellingPrice)} →{" "}
                      <span className="font-medium">{currency(h.newSellingPrice)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}