import DataTable from "@/components/DataTableComponents/DataTable";
import { columns } from "./columns";
import ModalTableHeader from "@/components/dashboard/Tables/ModalTableHeader";
import { getAuthenticatedUser } from "@/config/useAuth";
import { getOrgUnits } from "@/actions/units";
import { UnitForm } from "@/components/Forms/Inventory/UnitForm";
import { getOrgTaxes } from "@/actions/tax";
import { TaxRateForm } from "@/components/Forms/Inventory/TaxRateForm";

export default async function page() {
  
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;
  const taxes = (await getOrgTaxes(orgId)) || [];  
  return (
    <div className="p-8">
      <ModalTableHeader
        title="Taxes"
        linkTitle="Add Tax"
        href="#"
        data={taxes}
        model="unit"
        modalForm={<TaxRateForm orgId={orgId}/>}
      />
      <DataTable columns={columns} data={taxes} />
    </div>
  );
}
 