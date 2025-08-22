import FloatingSocials from "@/components/agency/FloatingSocials";
import Footer from "@/components/agency/Footer";
import Navbar from "@/components/agency/Navbar";
import React, { ReactNode } from "react";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Navbar />
      {children}
      <FloatingSocials />
      <Footer />
    </div>
  );
}
