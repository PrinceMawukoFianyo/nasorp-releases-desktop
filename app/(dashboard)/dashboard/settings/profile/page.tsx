import { getUserById } from "@/actions/users";
import UserProfileForm from "@/components/Forms/UserProfileForm";
import { getAuthenticatedUser } from "@/config/useAuth";

import React from "react";

export default async function page() {
  const user = await getAuthenticatedUser();
  const userDetails = await getUserById(user?.id ?? "");
  const userProfile = {
    id: userDetails?.id ?? "",
    firstName: userDetails?.firstName ?? "",
    lastName: userDetails?.lastName ?? "",
    email: userDetails?.email ?? "",
    phone: userDetails?.phone ?? "",
    jobTitle: userDetails?.jobTitle ?? "",
    image: userDetails?.image ?? "",
  };
  return (
    <div>
      <UserProfileForm currentUser={userProfile} />;
    </div>
  );
}
