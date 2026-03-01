// app/dashboard/settings/tax-rates/page.tsx
import { columns } from "./columns";
import { getAuthenticatedUser } from "@/config/useAuth";
import { getOrgTaxes } from "@/actions/tax";
import TaxRatesClient from "./TaxRatesClient";


export default async function TaxRatesPage() {
  const user = await getAuthenticatedUser();
  const taxes = (await getOrgTaxes(user.orgId)) || [];

  return <TaxRatesClient taxes={taxes} orgId={user.orgId} />;
}