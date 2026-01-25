"use client";

import VerifyOTPForm from "../../../../components/Forms/VerifyForms";
import { GridBackground } from "../../../../components/reusable-ui/grid-background";
import React from "react";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const {userId} = await params;
  const email = (await searchParams).email as string;
  
  return (
    <GridBackground>
      <div className="px-4">
        <VerifyOTPForm email={email} userId={userId} />
      </div>
    </GridBackground>
  );
}
