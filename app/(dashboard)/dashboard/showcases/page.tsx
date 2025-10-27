import { ShowcaseForm } from "@/components/Forms/ShowCaseForm";
import { getAuthenticatedUser } from "@/config/useAuth";

import React from "react";

export default async function page() {
  const user = await getAuthenticatedUser();
  return (
    <div>
      <ShowcaseForm userId={user?.id ?? ""} />
    </div>
  );
}
