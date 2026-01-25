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
  const {orgId} = await params;
  const resolvedSearchParams = await searchParams;
  
  // Debug: Log all search params
  console.log("🔍 All Search Params:", resolvedSearchParams);
  
  const email = resolvedSearchParams.email as string;
  const roleId = resolvedSearchParams.roleId as string;
  const locationId = resolvedSearchParams.locationId as string;
  const locationName = resolvedSearchParams.locationName as string;
  const orgName = resolvedSearchParams.orgName as string;
  
  // Debug: Log individual values
  console.log("📧 Email from URL:", email);
  console.log("🏢 Org Name:", orgName);
  console.log("👤 Role ID:", roleId);
  console.log("📍 Location ID:", locationId);
  console.log("📍 Location Name:", locationName);
  
  return (
    <GridBackground>
      <div className="px-4">
        <RegisterInvitedUserForm 
          userEmail={email} 
          orgId={orgId} 
          orgName={orgName} 
          roleId={roleId} 
          locationName={locationName}  
          locationId={locationId} 
        />
      </div>
    </GridBackground>
  );
}