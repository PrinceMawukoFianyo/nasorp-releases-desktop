import DataTable from "@/components/DataTableComponents/DataTable";
import { columns } from "./columns";
import ModalTableHeader from "@/components/dashboard/Tables/ModalTableHeader";
import { getAuthenticatedUser } from "@/config/useAuth";
import { getOrgUnits } from "@/actions/units";
import { UnitForm } from "@/components/Forms/Inventory/UnitForm";
import { getOrgBrands } from "@/actions/brands";
import { BrandForm } from "@/components/Forms/Inventory/BrandForm";

export default async function page() {
  
  const user = await getAuthenticatedUser()

  const orgId = user.orgId;
  const orgName = user?.orgName ?? "";
  const brands = (await getOrgBrands (orgId)) || [];  
  return (
    <div className="p-8">
      <ModalTableHeader
        title="Brands"
        linkTitle="Add Brand"
        href="#"
        data={brands}
        model="brand"
        modalForm={<BrandForm orgId={orgId}/>}
      />
      <DataTable columns={columns} data={brands} />
    </div>
  );
}
 