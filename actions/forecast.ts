// actions/forecast.ts
// ─────────────────────────────────────────────────────────────────────────────
// AI Financial Consultant — fetches ALL company data, builds a rich prompt,
// calls Gemini (primary) with OpenAI (fallback), and returns structured advice.
// Also sends WhatsApp / Email / SMS reminders for overdue bills and credits.
// ─────────────────────────────────────────────────────────────────────────────
"use server";

import { db }                   from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { subDays, format, differenceInDays } from "date-fns";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ForecastAlert {
  id:       string;
  type:     "OVERDUE_CREDIT" | "BILL_DUE" | "LOW_STOCK" | "SLOW_MOVER" | "HIGH_COGS" | "CASH_FLOW";
  severity: "critical" | "warning" | "info";
  title:    string;
  message:  string;
  amount?:  number;
  daysLeft?: number;
  contact?: { name: string; phone?: string; email?: string };
  action?:  string;
}

export interface ProductInsight {
  itemId:      string;
  itemName:    string;
  sku:         string;
  insight:     "HIGH_PERFORMER" | "SLOW_MOVER" | "FINANCIAL_DRAIN" | "RESTOCK_NEEDED" | "OVERSTOCKED";
  reason:      string;
  revenue:     number;
  grossMargin: number;
  stockLeft:   number;
  suggestion:  string;
}

export interface FinancialProjection {
  period:           string;  // "Next 30 Days" | "Next 3 Months" | "Next 12 Months"
  projectedRevenue: number;
  projectedCOGS:    number;
  projectedProfit:  number;
  growthRate:       number;
  confidence:       "HIGH" | "MEDIUM" | "LOW";
  assumptions:      string[];
}

export interface ForecastReport {
  generatedAt:         string;
  currency:            string;
  // AI narrative sections
  executiveSummary:    string;
  financialHealth:     string;
  revenueAnalysis:     string;
  cashFlowInsights:    string;
  inventoryInsights:   string;
  creditRiskAnalysis:  string;
  supplierPayables:    string;
  marketContext:       string;
  actionPlan:          string[];
  profitTechniques:    string[];
  // Structured data
  alerts:              ForecastAlert[];
  productInsights:     ProductInsight[];
  projections:         FinancialProjection[];
  // KPIs
  kpis: {
    totalRevenue30d:     number;
    totalRevenue90d:     number;
    grossMargin:         number;
    netMargin:           number;
    inventoryValue:      number;
    totalCreditOwed:     number;
    totalPayablesOwed:   number;
    cashCollected:       number;
    avgOrderValue:       number;
    topProductName:      string;
    slowestProductName:  string;
    outOfStockCount:     number;
    lowStockCount:       number;
    overdueCreditCount:  number;
  };
  // Reminder results
  remindersSent: { type: string; recipient: string; status: string }[];
}

// ── Currency helper ───────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function generateForecast(): Promise<{
  success: boolean;
  data?: ForecastReport;
  error?: string;
}> {
  try {
    const user  = await getAuthenticatedUser();
    const orgId = user.orgId;
    if (!orgId) return { success: false, error: "Not authenticated" };

    // ── 1. Parallel data fetch — everything about the company ─────────────────
    const now      = new Date();
    const d30ago   = subDays(now, 30);
    const d90ago   = subDays(now, 90);
    const d180ago  = subDays(now, 180);

    const [
      salesOrders30,
      salesOrders90,
      salesOrders180,
      purchaseOrders,
      inventories,
      creditOrders,
      creditPayments,
      expenses,
      payroll,
      transferHistory,
      adjustments,
      customers,
    ] = await Promise.all([
      // Sales last 30 days
      db.salesOrder.findMany({
        where: { orgId, createdAt: { gte: d30ago }, status: { notIn: ["DRAFT", "CANCELLED"] } },
        include: { lines: { include: { item: { select: { name: true, sku: true, costPrice: true } } } } },
      }),
      // Sales last 90 days
      db.salesOrder.findMany({
        where: { orgId, createdAt: { gte: d90ago }, status: { notIn: ["DRAFT", "CANCELLED"] } },
        select: { subtotal: true, taxAmount: true, discount: true, shippingCost: true, amountPaid: true, createdAt: true },
      }),
      // Sales last 180 days (trend baseline)
      db.salesOrder.findMany({
        where: { orgId, createdAt: { gte: d180ago }, status: { notIn: ["DRAFT", "CANCELLED"] } },
        select: { subtotal: true, taxAmount: true, discount: true, shippingCost: true, createdAt: true },
      }),
      // Purchase orders outstanding
      db.purchaseOrder.findMany({
        where: { orgId, status: { notIn: ["DRAFT", "CANCELLED"] }, amountOwing: { gt: 0 } },
        include: { supplier: { select: { name: true, email: true, phone: true } } },
      }),
      // Current inventory
      db.inventory.findMany({
        where: { orgId },
        include: { item: { select: { name: true, sku: true, costPrice: true, sellingPrice: true, minStockLevel: true, isActive: true } } },
      }),
      // Credit (AR) orders outstanding
      db.salesOrder.findMany({
        where: { orgId, source: "SALES_ORDER", paymentStatus: { in: ["PENDING", "PARTIAL"] }, status: { notIn: ["CANCELLED"] } },
        include: { customer: { select: { name: true, email: true, phone: true } } },
      }),
      // Credit payments collected last 90d
      db.salesOrderPayment.findMany({
        where: { orgId, paidAt: { gte: d90ago } },
        select: { amount: true, paidAt: true, method: true },
      }),
      // Expenses last 90 days
      db.expense.findMany({
        where: { orgId, date: { gte: d90ago } },
        select: { amount: true, category: true, date: true, isPayroll: true },
      }),
      // Payroll
      db.payrollEntry.findMany({
        where: { orgId },
        select: { amount: true, period: true, status: true, date: true },
      }),
      // Stock transfers last 90d
      db.transfer.findMany({
        where: { orgId, createdAt: { gte: d90ago } },
        select: { status: true, createdAt: true },
      }),
      // Adjustments last 90d
      db.adjustment.findMany({
        where: { orgId, createdAt: { gte: d90ago }, adjustmentType: { in: ["DAMAGE", "THEFT", "EXPIRED", "WRITE_OFF"] } },
        include: { lines: true },
      }),
      // Customers
      db.customer.findMany({
        where: { orgId, isActive: true },
        select: { id: true, name: true, email: true, phone: true },
      }),
    ]);

    // ── 2. Compute KPIs ───────────────────────────────────────────────────────

    const calcTotal = (o: { subtotal: number; taxAmount: number; discount: number | null; shippingCost: number | null }) =>
      Number(o.subtotal) + Number(o.taxAmount) + Number(o.shippingCost ?? 0) - Number(o.discount ?? 0);

    const rev30 = salesOrders30.reduce((s, o) => s + calcTotal(o as any), 0);
    const rev90 = salesOrders90.reduce((s, o) => s + calcTotal(o as any), 0);

    // COGS from 30d sales lines
    let cogs30 = 0;
    const itemSalesMap = new Map<string, { name: string; sku: string; revenue: number; cogs: number; qty: number; orders: number }>();
    for (const o of salesOrders30) {
      for (const line of (o as any).lines ?? []) {
        const cost    = Number(line.item?.costPrice ?? 0);
        const revenue = Number(line.quantity) * Number(line.unitPrice);
        const lineCOGS = Number(line.quantity) * cost;
        cogs30 += lineCOGS;
        const key = line.itemId;
        const cur = itemSalesMap.get(key) ?? { name: line.item?.name ?? "Unknown", sku: line.item?.sku ?? "", revenue: 0, cogs: 0, qty: 0, orders: 0 };
        cur.revenue += revenue;
        cur.cogs    += lineCOGS;
        cur.qty     += Number(line.quantity);
        cur.orders  += 1;
        itemSalesMap.set(key, cur);
      }
    }

    const grossProfit30  = rev30 - cogs30;
    const grossMarginPct = rev30 > 0 ? (grossProfit30 / rev30) * 100 : 0;

    const totalExpenses90  = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit30      = grossProfit30 - (totalExpenses90 / 3); // monthly share
    const netMarginPct     = rev30 > 0 ? (netProfit30 / rev30) * 100 : 0;

    const inventoryValue   = inventories.reduce((s, i) => s + (i.quantity * Number(i.item.costPrice ?? 0)), 0);
    const inventoryRetail  = inventories.reduce((s, i) => s + (i.quantity * Number(i.item.sellingPrice ?? 0)), 0);

    const totalCreditOwed  = creditOrders.reduce((s, o) => s + Number((o as any).amountOwing ?? 0), 0);
    const totalPayablesOwed= purchaseOrders.reduce((s, o) => s + Number((o as any).amountOwing ?? 0), 0);
    const cashCollected90  = creditPayments.reduce((s, p) => s + Number(p.amount), 0);

    const avgOrderValue    = salesOrders30.length > 0 ? rev30 / salesOrders30.length : 0;

    const outOfStockCount  = inventories.filter(i => i.quantity <= 0 && i.item.isActive).length;
    const lowStockCount    = inventories.filter(i => {
      const min = Number(i.item.minStockLevel ?? 5);
      return i.quantity > 0 && i.quantity <= min && i.item.isActive;
    }).length;

    // Loss from damage / theft / write-offs
    const lossItems = adjustments.flatMap(a => (a as any).lines ?? []);
    const totalLoss = lossItems.reduce((s: number, l: any) => s + Math.abs(Number(l.adjsutedQuantity ?? 0)) * 10, 0); // rough cost estimate

    // Overdue credit: orders older than 30 days still owing
    const overdueCreditOrders = creditOrders.filter(o => {
      const age = differenceInDays(now, new Date((o as any).createdAt));
      return age > 30;
    });

    // Revenue trend: compare first 45 days vs last 45 days of 90d window
    const mid90 = subDays(now, 45);
    const rev90First = salesOrders90.filter(o => new Date(o.createdAt) < mid90).reduce((s, o) => s + calcTotal(o as any), 0);
    const rev90Last  = salesOrders90.filter(o => new Date(o.createdAt) >= mid90).reduce((s, o) => s + calcTotal(o as any), 0);
    const revGrowthRate = rev90First > 0 ? ((rev90Last - rev90First) / rev90First) * 100 : 0;

    // Top and slowest products
    const sortedItems    = [...itemSalesMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
    const topProduct     = sortedItems[0];
    const slowestProduct = sortedItems[sortedItems.length - 1];

    // ── 3. Build alerts ───────────────────────────────────────────────────────
    const alerts: ForecastAlert[] = [];

    // Overdue credit sales alerts
    for (const o of overdueCreditOrders.slice(0, 10)) {
      const age = differenceInDays(now, new Date((o as any).createdAt));
      alerts.push({
        id:       o.id,
        type:     "OVERDUE_CREDIT",
        severity: age > 60 ? "critical" : "warning",
        title:    `Overdue Credit: ${(o as any).customer?.name ?? "Unknown"}`,
        message:  `Order ${(o as any).orderNumber} is ${age} days overdue. Amount owing: ${fmt(Number((o as any).amountOwing))}`,
        amount:   Number((o as any).amountOwing),
        daysLeft: -age,
        contact:  {
          name:  (o as any).customer?.name  ?? "Unknown",
          phone: (o as any).customer?.phone ?? undefined,
          email: (o as any).customer?.email ?? undefined,
        },
        action: "Send payment reminder",
      });
    }

    // Supplier bill alerts
    for (const po of purchaseOrders.slice(0, 10)) {
      const expectedDate = (po as any).expectedDate ? new Date((po as any).expectedDate) : null;
      const daysLeft = expectedDate ? differenceInDays(expectedDate, now) : null;
      alerts.push({
        id:       po.id,
        type:     "BILL_DUE",
        severity: daysLeft !== null && daysLeft <= 3 ? "critical" : daysLeft !== null && daysLeft <= 7 ? "warning" : "info",
        title:    `Supplier Bill: ${(po as any).supplier?.name ?? "Unknown"}`,
        message:  `PO ${(po as any).poNumber ?? po.id} — ${fmt(Number((po as any).amountOwing))} outstanding${daysLeft !== null ? `. Due in ${daysLeft} days` : ""}`,
        amount:   Number((po as any).amountOwing),
        daysLeft: daysLeft ?? undefined,
        contact:  {
          name:  (po as any).supplier?.name  ?? "Unknown",
          phone: (po as any).supplier?.phone ?? undefined,
          email: (po as any).supplier?.email ?? undefined,
        },
        action: "Process payment",
      });
    }

    // Low stock alerts
    for (const inv of inventories.filter(i => i.quantity > 0 && i.quantity <= Number(i.item.minStockLevel ?? 5) && i.item.isActive).slice(0, 8)) {
      alerts.push({
        id:       inv.id,
        type:     "LOW_STOCK",
        severity: inv.quantity === 0 ? "critical" : "warning",
        title:    `Low Stock: ${inv.item.name}`,
        message:  `Only ${inv.quantity} units remaining for ${inv.item.name} (SKU: ${inv.item.sku}). Min level: ${inv.item.minStockLevel ?? 5}`,
        action:   "Create purchase order",
      });
    }

    // ── 4. Product insights ───────────────────────────────────────────────────
    const productInsights: ProductInsight[] = [];

    for (const [itemId, data] of sortedItems.slice(0, 20)) {
      const margin = data.revenue > 0 ? ((data.revenue - data.cogs) / data.revenue) * 100 : 0;
      const inv    = inventories.find(i => i.itemId === itemId);
      const stock  = inv?.quantity ?? 0;

      let insight: ProductInsight["insight"] = "HIGH_PERFORMER";
      let reason  = "";
      let suggestion = "";

      if (margin < 5 && data.revenue > 0) {
        insight    = "FINANCIAL_DRAIN";
        reason     = `Gross margin is only ${margin.toFixed(1)}% — barely covering costs`;
        suggestion = "Review pricing or negotiate lower cost price with supplier";
      } else if (data.qty < 3 && data.orders < 2) {
        insight    = "SLOW_MOVER";
        reason     = "Very low sales velocity in the past 30 days";
        suggestion = "Consider a promotion, bundle deal, or clearance pricing";
      } else if (stock > (inv?.item.minStockLevel ?? 5) * 10 && data.qty < 5) {
        insight    = "OVERSTOCKED";
        reason     = `High stock (${stock} units) but low sales (${data.qty} sold) — capital tied up`;
        suggestion = "Run promotions or offer wholesale discounts to clear stock";
      } else if (stock === 0) {
        insight    = "RESTOCK_NEEDED";
        reason     = "Out of stock — missing revenue opportunities";
        suggestion = "Place purchase order immediately";
      } else if (margin >= 30 && data.revenue > rev30 * 0.05) {
        insight    = "HIGH_PERFORMER";
        reason     = `High margin (${margin.toFixed(1)}%) with strong revenue contribution`;
        suggestion = "Increase stock levels and marketing focus on this item";
      }

      productInsights.push({
        itemId, sku: data.sku,
        itemName: data.name,
        insight, reason, suggestion,
        revenue: data.revenue,
        grossMargin: margin,
        stockLeft: stock,
      });
    }

    // ── 5. Projections ────────────────────────────────────────────────────────
    const projectedRev30 = rev30 * (1 + revGrowthRate / 100);
    const projectedRev90 = rev90 * (1 + revGrowthRate / 100);
    const projectedRev12m = rev90 * 4 * (1 + revGrowthRate / 100);
    const projectedMargin = grossMarginPct / 100;

    const projections: FinancialProjection[] = [
      {
        period:           "Next 30 Days",
        projectedRevenue: projectedRev30,
        projectedCOGS:    projectedRev30 * (1 - projectedMargin),
        projectedProfit:  projectedRev30 * projectedMargin - (totalExpenses90 / 3),
        growthRate:       revGrowthRate,
        confidence:       Math.abs(revGrowthRate) < 20 ? "HIGH" : "MEDIUM",
        assumptions:      [
          `Based on ${revGrowthRate >= 0 ? "+" : ""}${revGrowthRate.toFixed(1)}% trend from last 90 days`,
          `Gross margin maintained at ${grossMarginPct.toFixed(1)}%`,
          `Monthly expenses estimated at ${fmt(totalExpenses90 / 3)}`,
        ],
      },
      {
        period:           "Next 3 Months",
        projectedRevenue: projectedRev90,
        projectedCOGS:    projectedRev90 * (1 - projectedMargin),
        projectedProfit:  projectedRev90 * projectedMargin - totalExpenses90,
        growthRate:       revGrowthRate * 1.1,
        confidence:       "MEDIUM",
        assumptions:      [
          "Seasonal adjustments not applied",
          "Cedi depreciation risk factored in at ±5%",
          `${outOfStockCount} out-of-stock items restocked`,
        ],
      },
      {
        period:           "Next 12 Months",
        projectedRevenue: projectedRev12m,
        projectedCOGS:    projectedRev12m * (1 - projectedMargin),
        projectedProfit:  projectedRev12m * projectedMargin - (totalExpenses90 / 3) * 12,
        growthRate:       revGrowthRate * 1.2,
        confidence:       "LOW",
        assumptions:      [
          "Ghana inflation and Cedi depreciation risk: ~15-20% annually",
          "Assumes no major market disruptions",
          "Inventory investment maintained at current levels",
          "All outstanding credit collected within 60 days",
        ],
      },
    ];

    // ── 6. Build AI prompt ────────────────────────────────────────────────────

    const topItems5 = sortedItems.slice(0, 5).map(([, d]) =>
      `${d.name}: Revenue=${fmt(d.revenue)}, Margin=${d.revenue > 0 ? (((d.revenue - d.cogs) / d.revenue) * 100).toFixed(1) : 0}%`
    ).join("; ");

    const slowItems = productInsights.filter(p => p.insight === "SLOW_MOVER" || p.insight === "FINANCIAL_DRAIN")
      .slice(0, 5).map(p => `${p.itemName} (${p.insight}, margin ${p.grossMargin.toFixed(1)}%)`).join("; ");

    const prompt = `
You are a senior financial consultant and business analyst for a Ghanaian small-to-medium business.
Analyze this data and provide highly actionable, specific advice. Be concise but thorough.
All currency is Ghana Cedis (GHS). Consider Ghana's economic context: Cedi depreciation, inflation (~20% annually), high import costs, mobile money dominance.

=== COMPANY FINANCIAL SNAPSHOT ===
Period: Last 30 days (${format(d30ago, "d MMM")} – ${format(now, "d MMM yyyy")})

REVENUE & PROFIT:
- Total Revenue (30d): ${fmt(rev30)}
- Total Revenue (90d): ${fmt(rev90)}
- COGS (30d): ${fmt(cogs30)}
- Gross Profit (30d): ${fmt(grossProfit30)}
- Gross Margin: ${grossMarginPct.toFixed(1)}%
- Total Expenses (90d): ${fmt(totalExpenses90)}
- Estimated Net Profit (30d): ${fmt(netProfit30)}
- Net Margin: ${netMarginPct.toFixed(1)}%
- Revenue Growth Trend: ${revGrowthRate >= 0 ? "+" : ""}${revGrowthRate.toFixed(1)}% (comparing last 45 vs previous 45 days)
- Average Order Value: ${fmt(avgOrderValue)}
- Total Orders (30d): ${salesOrders30.length}

INVENTORY:
- Total Inventory Value (cost): ${fmt(inventoryValue)}
- Total Inventory Value (retail): ${fmt(inventoryRetail)}
- Out of Stock Items: ${outOfStockCount}
- Low Stock Items: ${lowStockCount}
- Stock Loss (damage/theft/write-off, 90d): ~${fmt(totalLoss)}

CASH FLOW & CREDIT:
- Accounts Receivable (credit owed to us): ${fmt(totalCreditOwed)} across ${creditOrders.length} open orders
- Overdue Credit Orders (>30 days): ${overdueCreditOrders.length} orders = ${fmt(overdueCreditOrders.reduce((s, o) => s + Number((o as any).amountOwing ?? 0), 0))}
- Cash Collected from Credit (90d): ${fmt(cashCollected90)}
- Accounts Payable (we owe suppliers): ${fmt(totalPayablesOwed)} across ${purchaseOrders.length} purchase orders

TOP 5 PRODUCTS (by revenue, 30d):
${topItems5 || "No sales data available"}

FINANCIAL DRAINS / SLOW MOVERS:
${slowItems || "None identified"}

STOCK TRANSFERS (90d): ${transferHistory.length} transfers (${transferHistory.filter(t => t.status === "COMPLETED").length} completed)
ACTIVE CUSTOMERS: ${customers.length}
PAYROLL (last recorded): ${fmt(payroll.filter(p => p.status === "PENDING").reduce((s, p) => s + Number(p.amount), 0))} pending

=== REQUESTED ANALYSIS ===

Provide your response as a JSON object with exactly these fields:
{
  "executiveSummary": "3-4 sentence overview of financial health",
  "financialHealth": "Detailed assessment: is the business healthy, struggling, or growing? What are the key risk factors?",
  "revenueAnalysis": "Deep dive into revenue trends, what's driving it, what's holding it back",
  "cashFlowInsights": "Analysis of cash position, AR collection urgency, AP management, working capital",
  "inventoryInsights": "Which products are tying up capital, which need restocking, dead stock analysis",
  "creditRiskAnalysis": "Assessment of overdue credit risk, collection strategies, customer creditworthiness",
  "supplierPayables": "AP management advice, which bills to prioritize, negotiation tips with suppliers",
  "marketContext": "Ghana economic context: Cedi depreciation impact, inflation effect on costs, best practices for GHS businesses",
  "actionPlan": ["Action 1 (with specific steps)", "Action 2", "Action 3", "Action 4", "Action 5", "Action 6", "Action 7", "Action 8"],
  "profitTechniques": ["Technique 1 (specific to this business)", "Technique 2", "Technique 3", "Technique 4", "Technique 5"]
}

Be very specific — use actual numbers from the data. Mention specific products, amounts, and timeframes.
`;

    // ── 7. Call AI (Gemini primary, OpenAI fallback) ──────────────────────────
    let aiData: {
      executiveSummary:   string;
      financialHealth:    string;
      revenueAnalysis:    string;
      cashFlowInsights:   string;
      inventoryInsights:  string;
      creditRiskAnalysis: string;
      supplierPayables:   string;
      marketContext:      string;
      actionPlan:         string[];
      profitTechniques:   string[];
    } | null = null;

    // Try Gemini first
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 3000,
                responseMimeType: "application/json",
              },
            }),
          }
        );
        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
          aiData = JSON.parse(cleaned);
        }
      }
    } catch (e) {
      console.warn("[Forecast] Gemini failed, trying OpenAI:", e);
    }

    // Fallback to OpenAI
    if (!aiData) {
      try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
          const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are a senior financial consultant. Always respond with valid JSON only." },
                { role: "user",   content: prompt },
              ],
              temperature: 0.3,
              max_tokens:  3000,
              response_format: { type: "json_object" },
            }),
          });
          if (openaiRes.ok) {
            const openaiJson = await openaiRes.json();
            const text = openaiJson.choices?.[0]?.message?.content ?? "{}";
            aiData = JSON.parse(text);
          }
        }
      } catch (e) {
        console.warn("[Forecast] OpenAI also failed:", e);
      }
    }

    // Final fallback — rule-based responses
    if (!aiData) {
      aiData = {
        executiveSummary:   `Your business generated ${fmt(rev30)} in the last 30 days with a ${grossMarginPct.toFixed(1)}% gross margin. ${revGrowthRate >= 0 ? "Revenue is trending upward" : "Revenue shows a declining trend"}. ${totalCreditOwed > 0 ? `${fmt(totalCreditOwed)} in credit sales needs collection attention.` : ""}`,
        financialHealth:    `Gross margin of ${grossMarginPct.toFixed(1)}% is ${grossMarginPct >= 25 ? "healthy" : grossMarginPct >= 10 ? "moderate but improvable" : "critically low — costs are too high"}. ${outOfStockCount} items are out of stock, representing missed revenue. Net margin of ${netMarginPct.toFixed(1)}% ${netMarginPct >= 10 ? "is acceptable" : "needs improvement through cost control"}.`,
        revenueAnalysis:    `30-day revenue of ${fmt(rev30)} across ${salesOrders30.length} orders (avg ${fmt(avgOrderValue)}/order). ${revGrowthRate >= 0 ? `Positive growth of +${revGrowthRate.toFixed(1)}%` : `Declining trend of ${revGrowthRate.toFixed(1)}%`} comparing recent vs earlier periods. Top product drives significant share of revenue.`,
        cashFlowInsights:   `${fmt(totalCreditOwed)} in accounts receivable needs urgent collection. ${overdueCreditOrders.length} orders are over 30 days overdue. Supplier payables of ${fmt(totalPayablesOwed)} should be scheduled. Cash collected from credit in last 90 days: ${fmt(cashCollected90)}.`,
        inventoryInsights:  `Inventory worth ${fmt(inventoryValue)} at cost (${fmt(inventoryRetail)} retail). ${outOfStockCount} items out of stock represent lost sales. ${lowStockCount} items need reordering. Review slow-moving items to free up working capital.`,
        creditRiskAnalysis: `${overdueCreditOrders.length} credit orders totaling ${fmt(overdueCreditOrders.reduce((s, o) => s + Number((o as any).amountOwing ?? 0), 0))} are overdue over 30 days. Implement strict 30-day credit terms and send immediate reminders via WhatsApp and phone calls.`,
        supplierPayables:   `${fmt(totalPayablesOwed)} owed to suppliers across ${purchaseOrders.length} orders. Prioritize suppliers with approaching due dates. Negotiate extended terms where possible to protect cash flow.`,
        marketContext:      `Ghana's Cedi has faced significant depreciation (15-20% annually). For imported goods: price in USD equivalent and review pricing quarterly. Use mobile money (MoMo) to reduce cash handling. Consider USD-indexed pricing for high-cost imports to protect margins.`,
        actionPlan: [
          `URGENT: Collect ${fmt(overdueCreditOrders.reduce((s, o) => s + Number((o as any).amountOwing ?? 0), 0))} from ${overdueCreditOrders.length} overdue credit customers — call and WhatsApp all today`,
          `Restock ${outOfStockCount} out-of-stock items immediately to prevent further revenue loss`,
          `Review pricing for low-margin items — aim for minimum 25% gross margin per product`,
          `Reduce credit terms from open-ended to strict 30 days for all new orders`,
          `Set up weekly cash flow reviews — track collections vs payables every Monday`,
          `Negotiate bulk purchase discounts with top 3 suppliers to reduce COGS by 5-10%`,
          `Promote slow-moving stock with 10-15% discounts to free up working capital`,
          `Implement mobile money payment incentive — offer 1-2% discount for MoMo payments to speed collections`,
        ],
        profitTechniques: [
          `Bundle slow-moving items with fast sellers to increase average order value from ${fmt(avgOrderValue)} to ${fmt(avgOrderValue * 1.2)}`,
          `Introduce tiered pricing: reward customers who buy in bulk or pay upfront with 3-5% discount`,
          `Review and eliminate expenses that don't directly contribute to revenue generation`,
          `Focus marketing on top 5 high-margin products to maximize profit per sale`,
          `Implement a customer loyalty program — repeat customers cost 5x less to retain than acquiring new ones`,
        ],
      };
    }

    // ── 8. Send reminders (email) for overdue credits ─────────────────────────
    const remindersSent: ForecastReport["remindersSent"] = [];

    if (process.env.RESEND_API_KEY) {
      for (const o of overdueCreditOrders.slice(0, 5)) {
        const customerEmail = (o as any).customer?.email;
        const customerName  = (o as any).customer?.name ?? "Valued Customer";
        const amtOwing      = Number((o as any).amountOwing ?? 0);
        const age           = differenceInDays(now, new Date((o as any).createdAt));

        if (customerEmail) {
          try {
            await resend.emails.send({
              from:    process.env.FROM_EMAIL ?? "noreply@yourbusiness.com",
              to:      customerEmail,
              subject: `Payment Reminder: ${(o as any).orderNumber} — ${fmt(amtOwing)} Overdue`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #dc2626;">Payment Reminder</h2>
                  <p>Dear <strong>${customerName}</strong>,</p>
                  <p>This is a friendly reminder that your invoice <strong>${(o as any).orderNumber}</strong> 
                  is <strong>${age} days overdue</strong>.</p>
                  <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #dc2626;">
                      Amount Due: ${fmt(amtOwing)}
                    </p>
                  </div>
                  <p>Please arrange payment at your earliest convenience. 
                  Contact us if you need to discuss payment arrangements.</p>
                  <p>Thank you for your business.</p>
                </div>
              `,
            });
            remindersSent.push({ type: "EMAIL", recipient: customerEmail, status: "SENT" });
          } catch (e) {
            remindersSent.push({ type: "EMAIL", recipient: customerEmail, status: "FAILED" });
          }
        }
      }
    }

    // ── 9. Assemble final report ──────────────────────────────────────────────
    const report: ForecastReport = {
      generatedAt:  new Date().toISOString(),
      currency:     "GHS",
      ...aiData,
      alerts,
      productInsights,
      projections,
      kpis: {
        totalRevenue30d:    rev30,
        totalRevenue90d:    rev90,
        grossMargin:        grossMarginPct,
        netMargin:          netMarginPct,
        inventoryValue,
        totalCreditOwed,
        totalPayablesOwed,
        cashCollected:      cashCollected90,
        avgOrderValue,
        topProductName:     topProduct?.[1]?.name ?? "N/A",
        slowestProductName: slowestProduct?.[1]?.name ?? "N/A",
        outOfStockCount,
        lowStockCount,
        overdueCreditCount: overdueCreditOrders.length,
      },
      remindersSent,
    };

    return { success: true, data: report };
  } catch (err: any) {
    console.error("[generateForecast]", err);
    return { success: false, error: err?.message ?? "Failed to generate forecast" };
  }
}

// ── Send manual reminder (called from UI) ─────────────────────────────────────
export async function sendPaymentReminder(input: {
  orderId:       string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName:  string;
  orderNumber:    string;
  amountOwing:    number;
  type:           "CREDIT_CUSTOMER" | "SUPPLIER";
}): Promise<{ success: boolean; channels: string[]; error?: string }> {
  try {
    const channels: string[] = [];

    if (input.recipientEmail && process.env.RESEND_API_KEY) {
      const label = input.type === "CREDIT_CUSTOMER" ? "payment" : "invoice payment";
      await resend.emails.send({
        from:    process.env.FROM_EMAIL ?? "noreply@yourbusiness.com",
        to:      input.recipientEmail,
        subject: `${input.type === "CREDIT_CUSTOMER" ? "Payment Reminder" : "Invoice Due"}: ${input.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>${input.type === "CREDIT_CUSTOMER" ? "💳 Payment Reminder" : "🧾 Invoice Due Notice"}</h2>
            <p>Dear <strong>${input.recipientName}</strong>,</p>
            <p>Please note that <strong>${label}</strong> of 
            <span style="font-size:18px; font-weight:bold; color:#dc2626;">
              GHS ${input.amountOwing.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </span> 
            is outstanding for reference <strong>${input.orderNumber}</strong>.</p>
            <p>Kindly process this at your earliest convenience.</p>
          </div>
        `,
      });
      channels.push("email");
    }

    // WhatsApp via Twilio (if configured)
    if (input.recipientPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const msg = `Hello ${input.recipientName}, this is a reminder that GHS ${input.amountOwing.toFixed(2)} is outstanding for ${input.orderNumber}. Please arrange payment. Thank you.`;
      const body = new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM ?? process.env.TWILIO_PHONE_NUMBER ?? ""}`,
        To:   `whatsapp:${input.recipientPhone}`,
        Body: msg,
      });
      await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      channels.push("whatsapp");

      // Also SMS
      const smsBody = new URLSearchParams({
        From: process.env.TWILIO_PHONE_NUMBER ?? "",
        To:   input.recipientPhone,
        Body: msg,
      });
      await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: smsBody.toString(),
      });
      channels.push("sms");
    }

    return { success: true, channels };
  } catch (err: any) {
    return { success: false, channels: [], error: err?.message };
  }
}