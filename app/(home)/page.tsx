import Iframe from "react-iframe";
import TechStackGrid from "@/components/frontend/Techstack";
import { GridBackground } from "@/components/reusable-ui/grid-background";
import ReUsableHero from "@/components/reusable-ui/reusable-hero";
import {
  Award,
  Github,
  Code,
  Code2,
  History,
  Sprout,
  Folder,
  Layout,
  Rocket,
} from "lucide-react";
import React from "react";
import Showcase from "@/components/frontend/showcase";
import Image from "next/image";
import { BorderBeam } from "@/components/magicui/border-beam";
import InventoryComparison from "@/components/reusable-ui/project-comparison";
import InventoryFeatureTabs from "@/components/frontend/SmoothTabs";
import HardwareStoreShowcase from "@/components/frontend/single-tier-pricing";
import HardwarePlumbingFAQ from "@/components/frontend/FAQ";
import HardwarePlumbingGrid from "@/components/frontend/Techstack";
import ProjectShowcase from "@/components/frontend/showcase";
import { getCurrentUsersCount } from "@/actions/users";

export default async function page() {
  const currentUsers = await getCurrentUsersCount();
  console.log(currentUsers)
  return (
    <section>
      <ReUsableHero
        theme="dark"
        announcement={{
          text: "New Stock: Steel Rect Pipes, Round Pipes & Premium Building Materials",
        }}
        title={
          <>
            Premium Building Materials
            <br />& Plumbing Supply Store
          </>
        }
        mobileTitle="Premium Building & Plumbing Supplies"
        subtitle="Your one-stop shop for quality steel rect pipes, round metal pipes, reducers, fittings, and complete building materials. From plumbing essentials to decorative hardware, we supply contractors, builders, and homeowners with everything needed for residential and commercial construction projects."
        buttons={[
          {
            label: "Browse Our Catalog",
            href: "/register",
            primary: true,
          },
          {
            label: "View demo",
            href: "/#demo",
          },
        ]}
        icons={[
          { icon: Code2, position: "left" },
          { icon: Layout, position: "right" }, // Changed to Layout for dashboard representation
          { icon: Rocket, position: "center" }, // Changed to Rocket for launch/speed representation
        ]}
        backgroundStyle="green"
        className="min-h-[70vh]"
        userCount={currentUsers > 1 ? currentUsers : null}
      />
      <GridBackground>
        <div className="px-8 py-16 ">
          <HardwarePlumbingGrid />
        </div>
      </GridBackground>
      <div className="py-16 max-w-6xl mx-auto px-8">
        <div className="relative rounded-lg overflow-hidden">
          <BorderBeam />
          <Image
            src="/images/dash-2.webp"
            alt="Building Materials Inventory Dashboard"
            width={1775}
            height={1109}
            className="w-full h-full rounded-lg object-cover  border shadow-2xl"
          />
        </div>
      </div>
      <InventoryComparison />
      <GridBackground className="">
        <InventoryFeatureTabs />
      </GridBackground>

      <div id="demo" className="py-16 max-w-6xl mx-auto relative">
        <Iframe
          url="https://www.youtube.com/watch?v=iyEWzl5iFc8&t=11s"
          width="100%"
          className="h-[32rem] rounded-lg"
          display="block"
          position="relative"
        />
        <div className="pb-16">
          <ProjectShowcase />
        </div>
        <div className="py-8">
          <HardwareStoreShowcase />
        </div>
      </div>
      <HardwarePlumbingFAQ />
    </section>
  );
}