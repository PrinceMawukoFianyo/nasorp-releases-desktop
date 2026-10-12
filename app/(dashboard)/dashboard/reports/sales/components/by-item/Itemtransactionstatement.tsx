"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getItemTransactionStatement,
  type ItemStatement,
} from "@/actions/sales-reports";

const money = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const esc = (s: string | number | null | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const saleLabel = (l: ItemStatement["lines"][number]) =>
  l.saleType === "WHOLESALE"
    ? `Wholesale${l.tierName ? ` – ${l.tierName}` : ""} (${l.packQuantity} × ${l.unitsPerPack})`
    : "Single";

// ─── Print just this item's statement (not the whole page) ───────────────────
function printStatement(s: ItemStatement) {
  const rows = s.lines
    .map(
      (l) => `
      <tr>
        <td>${esc(l.date)}<br/><small>${esc(l.time)}</small></td>
        <td class="mono">${esc(l.orderNumber)}</td>
        <td>${esc(l.customerName)}</td>
        <td>${esc(l.soldBy)}</td>
        <td>${esc(saleLabel(l))}</td>
        <td class="r">${l.quantity.toLocaleString()}</td>
        <td class="r">${esc(money(l.unitPrice))}</td>
        <td class="r b">${esc(money(l.lineTotal))}</td>
        <td>${esc(l.paymentStatus)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Statement – ${esc(s.item.name)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;color:#111;margin:32px;font-size:12px}
    h1{font-size:20px;margin:0 0 2px} .muted{color:#666}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 24px;margin:16px 0;padding:12px;background:#f7f7f7;border-radius:6px}
    .meta div span{display:block;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#f3f3f3;text-align:left;padding:8px;font-size:11px;border-bottom:2px solid #ddd}
    td{padding:8px;border-bottom:1px solid #eee;vertical-align:top}
    .r{text-align:right} .b{font-weight:600} .mono{font-family:ui-monospace,monospace;font-size:11px}
    small{color:#777}
    .totals{margin-top:16px;margin-left:auto;width:320px}
    .totals div{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee}
    .totals .grand{font-weight:700;font-size:14px;border-top:2px solid #111;border-bottom:none;margin-top:4px;padding-top:8px}
    .foot{margin-top:28px;color:#888;font-size:10px}
    @media print{body{margin:12mm}}
  </style></head><body>
    <h1>Item Transaction Statement</h1>
    <div class="muted">${esc(s.rangeLabel)} · Printed ${esc(new Date().toLocaleString("en-GB"))}</div>

    <div class="meta">
      <div><span>Item</span><b>${esc(s.item.name)}</b></div>
      <div><span>SKU</span>${esc(s.item.sku)}</div>
      <div><span>Category</span>${esc(s.item.category || "—")}</div>
      <div><span>Date item was added</span>${esc(s.item.dateAdded)}</div>
      <div><span>Selling price</span>${esc(money(s.item.sellingPrice))}</div>
      <div><span>Cost price</span>${esc(money(s.item.costPrice))}</div>
    </div>

    <table>
      <thead><tr>
        <th>Date</th><th>Order #</th><th>Customer</th><th>Sold by</th><th>Sale type</th>
        <th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th><th>Payment</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">No sales in this period</td></tr>`}</tbody>
    </table>

    <div class="totals">
      <div><span>Orders</span><span>${s.totals.orders}</span></div>
      <div><span>Single units sold</span><span>${s.totals.singleQuantity.toLocaleString()}</span></div>
      <div><span>Wholesale units sold</span><span>${s.totals.wholesaleQuantity.toLocaleString()}</span></div>
      <div><span>Total units sold</span><span>${s.totals.totalQuantity.toLocaleString()}</span></div>
      <div><span>Single revenue</span><span>${esc(money(s.totals.singleRevenue))}</span></div>
      <div><span>Wholesale revenue</span><span>${esc(money(s.totals.wholesaleRevenue))}</span></div>
      <div class="grand"><span>Total revenue</span><span>${esc(money(s.totals.totalRevenue))}</span></div>
    </div>
    <div class="foot">System-generated statement.</div>
  </body></html>`;

  // hidden iframe → no popup blockers, prints only the statement
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 300);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ItemTransactionStatement({ itemId }: { itemId: string }) {
  const [range, setRange] = useState("30");
  const [data, setData] = useState<ItemStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fit exactly inside the visible area of the parent table (no sideways scrolling)
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | undefined>();
  useLayoutEffect(() => {
    const scroller = boxRef.current?.closest(".overflow-x-auto") as HTMLElement | null;
    if (!scroller) return;
    const measure = () => setWidth(scroller.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getItemTransactionStatement(itemId, range === "all" ? null : Number(range))
      .then((r) => !cancelled && setData(r))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [itemId, range]);

  return (
    <div
      ref={boxRef}
      style={{ width }}
      className="sticky left-0 max-w-full overflow-hidden px-3 py-3 bg-sky-50/70 dark:bg-sky-950/20 border-l-2 border-sky-300"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold">Transaction Statement</h3>
        <div className="flex gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32 h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-background"
            disabled={!data || loading}
            onClick={() => data && printStatement(data)}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Statement
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading statement…
        </div>
      )}

      {!loading && error && (
        <p className="py-5 text-center text-xs text-red-600">
          Couldn&apos;t load this item&apos;s statement. Please try again.
        </p>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 rounded-md border bg-background/80 px-3 py-2 text-xs">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Item added</p>
              <p className="font-medium">{data.item.dateAdded}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">First sale</p>
              <p className="font-medium">{data.totals.firstSale ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Last sale</p>
              <p className="font-medium">{data.totals.lastSale ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Orders</p>
              <p className="font-medium">{data.totals.orders}</p>
            </div>
          </div>

          <div className="rounded-md border bg-background">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-muted/50 text-[11px]">
                <tr>
                  <th className="w-[11%] text-left px-2 py-1.5 font-semibold">Date</th>
                  <th className="w-[15%] text-left px-2 py-1.5 font-semibold">Doc #</th>
                  <th className="w-[16%] text-left px-2 py-1.5 font-semibold">Customer</th>
                  <th className="w-[13%] text-left px-2 py-1.5 font-semibold">Sold by</th>
                  <th className="w-[17%] text-left px-2 py-1.5 font-semibold">Type</th>
                  <th className="w-[6%] text-right px-2 py-1.5 font-semibold">Qty</th>
                  <th className="w-[10%] text-right px-2 py-1.5 font-semibold">Price</th>
                  <th className="w-[12%] text-right px-2 py-1.5 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">
                      No sales for this item in the selected period.
                    </td>
                  </tr>
                )}
                {data.lines.map((l, i) => (
                  <tr key={`${l.orderId}-${i}`} className="border-t align-top">
                    <td className="px-2 py-1.5 break-words">
                      {l.date}
                      <span className="block text-[10px] text-muted-foreground">{l.time}</span>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[10px] break-all">{l.orderNumber}</td>
                    <td className="px-2 py-1.5 break-words">{l.customerName}</td>
                    <td className="px-2 py-1.5 break-words">{l.soldBy}</td>
                    <td className="px-2 py-1.5">
                      {l.saleType === "WHOLESALE" ? (
                        <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 break-words">
                          {saleLabel(l)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Single</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium">{l.quantity.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right break-words">{money(l.unitPrice)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold break-words">
                      {money(l.lineTotal)}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {l.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {data.lines.length > 0 && (
                <tfoot className="text-xs">
                  <tr className="border-t-2 bg-muted/30">
                    <td colSpan={5} className="px-2 py-1.5 font-semibold">Totals</td>
                    <td className="px-2 py-1.5 text-right font-semibold">
                      {data.totals.totalQuantity.toLocaleString()}
                    </td>
                    <td />
                    <td className="px-2 py-1.5 text-right font-semibold break-words">
                      {money(data.totals.totalRevenue)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2 py-1 text-muted-foreground">Single sales</td>
                    <td className="px-2 py-1 text-right">{data.totals.singleQuantity.toLocaleString()}</td>
                    <td />
                    <td className="px-2 py-1 text-right break-words">{money(data.totals.singleRevenue)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2 py-1 text-muted-foreground">Wholesale sales</td>
                    <td className="px-2 py-1 text-right">{data.totals.wholesaleQuantity.toLocaleString()}</td>
                    <td />
                    <td className="px-2 py-1 text-right break-words">{money(data.totals.wholesaleRevenue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}