import RoleForm from "@/components/Forms/RoleForm";

interface PageProps {
  searchParams: Promise<{
    orgId?: string;
  }>;
}

export default async function page({ searchParams }: PageProps) {
  const { orgId = "" } = await searchParams;
  return <RoleForm orgId={orgId} />;
}