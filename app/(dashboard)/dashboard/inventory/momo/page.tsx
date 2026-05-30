// app/dashboard/momo/page.tsx
import { getAuthenticatedUser } from "@/config/useAuth";
import MomoDashboard from "./components/MomoDashboard";


export default async function MomoPage() {
  // Server-side auth check — restrict to users with momo.read permission
  const user = await getAuthenticatedUser();
  // You can pass server-fetched data (transactions, lines) as props here
  return <MomoDashboard />;
}