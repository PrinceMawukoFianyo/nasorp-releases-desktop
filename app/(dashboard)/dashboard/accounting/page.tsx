// app/dashboard/accounting/page.tsx
// Reads ?tab= from the URL so dropdown links land on the correct tab instantly.

import { Suspense }                   from "react";
import { getDashboardData }           from "@/actions/dashboard";
import { getAllLocationsSalesSummary } from "@/actions/location-sales";
import { getFinancialSummaries }      from "@/actions/dashboard";
// FIX: use getLedgerStats instead of getCreditLedger —
//   getLedgerStats is a lightweight query that:
//   • excludes POS orders (source = SALES_ORDER only)
//   • excludes CANCELLED orders from all totals
//   • computes activeDebtors as unique customers with amountOwing > 0
//   • uses real amountPaid / amountOwing from the DB columns
import { getLedgerStats }             from "@/actions/credit-ledger";
import { getOrgExpenses, getOrgPayroll } from "@/actions/accounting";
// ADDED — needed to know which tabs this user is allowed to see.
import { getAuthenticatedUser }       from "@/config/useAuth";
import AccountantDashboard            from "./components/accountantdashboard";

// ── Valid tab IDs ─────────────────────────────────────────────────────────────
const VALID_TABS = [
  "overview", "daily", "expenses", "payroll",
  "customers", "locations", "credit", "forecast", "paystack", "billing",
] as const;
type TabId = typeof VALID_TABS[number];

// ── Loading skeleton ──────────────────────────────────────────────────────────
function AccountingLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg mx-auto">
          ₵
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading financial data…
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AccountingPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  // Resolve the tab — fall back to "overview" if invalid or missing
  const rawTab     = searchParams?.tab ?? "overview";
  const initialTab: TabId = (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as TabId)
    : "overview";

  // ADDED — the logged-in user's permission strings (e.g. "accounting.read",
  // "accounting.payroll", "accounting.admin"), used client-side to gate
  // which tabs are visible/clickable in AccountantDashboard.
  const user = await getAuthenticatedUser();
  const userPermissions = user.permissions ?? [];

  // Fetch all data in parallel — never throws (Promise.allSettled)
  const [dashResult, locationResult, financialResult, creditResult, expensesResult, payrollResult] =
    await Promise.allSettled([
      getDashboardData("all"),
      getAllLocationsSalesSummary("all"),
      getFinancialSummaries("all"),
      getLedgerStats(),
      getOrgExpenses("all"),
      getOrgPayroll(),
    ]);

  const dashboardData = dashResult.status     === "fulfilled" ? dashResult.value     : null;
  const locationSales = locationResult.status === "fulfilled" ? locationResult.value : null;
  const financials    = financialResult.status === "fulfilled" ? financialResult.value : null;

  const ledgerStats    = creditResult.status   === "fulfilled" ? creditResult.value   : null;
  const expensesData   = expensesResult.status === "fulfilled" ? expensesResult.value : null;
  const payrollData    = payrollResult.status  === "fulfilled" ? payrollResult.value  : null;

  const initialExpenses = (expensesData?.data ?? []).map(e => ({
    id:          e.id,
    date:        e.date,
    category:    e.category,
    description: e.description,
    amount:      e.amount,
    recorded:    e.recordedBy,
    isPayroll:   e.isPayroll,
  }));

  const initialPayroll = (payrollData?.data ?? []).map(p => ({
    id:           p.id,
    employeeName: p.employeeName,
    role:         p.role,
    amount:       p.amount,
    period:       p.period,
    date:         p.date,
    status:       p.status as "PAID" | "PENDING",
  }));

  const creditSummary = ledgerStats?.success && ledgerStats.data
    ? {
        totalOutstanding: ledgerStats.data.totalOutstanding,  // excludes cancelled
        totalCollected:   ledgerStats.data.totalCollected,    // real payments received
        activeDebtors:    ledgerStats.data.activeDebtors,     // unique customers owing > 0
        overdueCount:     ledgerStats.data.overdueCount,
        paidCount:        ledgerStats.data.paidCount,
        partialCount:     ledgerStats.data.partialCount,
        pendingCount:     ledgerStats.data.pendingCount,
      }
    : null;

  return (
    <Suspense fallback={<AccountingLoading />}>
      <AccountantDashboard
        dashboardData={dashboardData}
        locationSales={locationSales}
        financials={financials}
        creditSummary={creditSummary}
        initialExpenses={initialExpenses}
        initialPayroll={initialPayroll}
        initialTab={initialTab}
        userPermissions={userPermissions}
      />
    </Suspense>
  );
}