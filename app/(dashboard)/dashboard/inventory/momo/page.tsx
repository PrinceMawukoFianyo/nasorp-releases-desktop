// app/dashboard/momo/page.tsx
// Reads ?tab= from the URL so sidebar dropdown links land on the correct tab
// instantly — same pattern as app/dashboard/accounting/page.tsx.

import { getAuthenticatedUser } from "@/config/useAuth";
import { getMomoLines, getMomoTransactions } from "@/actions/momo";
import MomoDashboard from "./components/MomoDashboard";

// ── Valid tab IDs — must match the `tab` state options inside MomoDashboard ──
const VALID_TABS = ["dashboard", "lines", "history", "request", "transfer", "card"] as const;
type TabId = typeof VALID_TABS[number];

export default async function MomoPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  // Server-side auth check — restrict to users with momo.read permission
  const user = await getAuthenticatedUser();

  // Resolve the tab — fall back to "dashboard" if invalid or missing
  const rawTab = searchParams?.tab ?? "dashboard";
  const initialTab: TabId = (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as TabId)
    : "dashboard";

  // Real data, fetched server-side — no more mock arrays in the client component
  const [linesRes, txRes] = await Promise.all([
    getMomoLines(),
    getMomoTransactions(100),
  ]);

  // Balance figures are gated behind a separate permission from the page
  // itself — a role can have momo.read (see the page, send requests) without
  // momo.balance.read (see how much money is on the merchant lines).
  // Adjust `user.permissions` below if getAuthenticatedUser() returns the
  // permission list under a different key (e.g. user.role.permissions).
  const canViewBalance = (user.permissions ?? []).includes("momo.balance.read");

  return (
    <MomoDashboard
      initialLines={linesRes.data}
      initialTransactions={txRes.data}
      canViewBalance={canViewBalance}
      initialTab={initialTab}
    />
  );
}