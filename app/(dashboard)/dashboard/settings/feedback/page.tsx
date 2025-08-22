import { FeedbackForm } from "@/components/Forms/FeedbackForm";
import { getAuthenticatedUser } from "@/config/useAuth";
import React from "react";

export default async function page() {
  const user = await getAuthenticatedUser();
  return (
    <div>
      <FeedbackForm userId={user?.id ?? ""} />
    </div>
  );
}
