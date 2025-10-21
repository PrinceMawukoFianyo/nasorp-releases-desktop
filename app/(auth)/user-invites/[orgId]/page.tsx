"use client";

import RegisterForm from "@/components/Forms/RegisterForm";
import RegisterInvitedUserForm from "@/components/Forms/RegisterInvitedUserForm";
import VerifyOTPForm from "@/components/Forms/VerifyForms";
import { GridBackground } from "@/components/reusable-ui/grid-background";
import React from "react";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // const linkUrl =`${baseUrl}/user-invite/${orgId}?roleId=${roleId}&& email=${email}&&orgName=${orgName}`;
  const {orgId} = await params;
  const email =  (await searchParams).email as string
  const roleId = (await searchParams).roleId as string
  const orgName = (await searchParams).orgName as string
  return (
    <GridBackground>
      <div className="px-4">
        <RegisterInvitedUserForm userEmail={email} orgId={orgId} orgName={orgName} roleId={roleId} />
      </div>
    </GridBackground>
  );
}
