import Footer from "@/components/frontend/footer";
import SiteHeader from "@/components/frontend/site-header";
import { authOptions } from "@/config/auth";
import { getServerSession } from "next-auth/next";
import React, { ReactNode } from "react";
import type { Session } from "next-auth";

export default async function HomeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions) as Session | null;
  
  return (
    <div className="bg-white">
      {/* <PromoBanner /> */}
      <SiteHeader session={session} />
      {children}
      <Footer />
    </div>
  );
}
