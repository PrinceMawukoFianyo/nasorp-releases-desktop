import { withOfflineFallback } from "@/lib/with-offline-fallback";
import { OfflineNotice } from "@/components/OfflineNotice";
import { getAuthenticatedUser } from "@/config/useAuth";
import { getMomoLines, getMomoTransactions } from "@/actions/momo";
import MomoDashboard from "./components/MomoDashboard";

const VALID_TABS = ["dashboard", "lines", "history", "request", "transfer", "card"] as const;
type TabId = typeof VALID_TABS[number];

export default async function MomoPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const user = await getAuthenticatedUser();

  const rawTab = searchParams?.tab ?? "dashboard";
  const initialTab: TabId = (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as TabId)
    : "dashboard";

  const { data, offline } = await withOfflineFallback(
    () => Promise.all([getMomoLines(), getMomoTransactions(100)]),
    [{ success: false, data: [] }, { success: false, data: [] }] as const
  );
  if (offline) return <OfflineNotice feature="MoMo Payments" />;

  const [linesRes, txRes] = data;
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