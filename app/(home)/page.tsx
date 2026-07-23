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
          text: "New Stock: Biscuits, Beverages & Household Provisions Now Available",
        }}
        title={
              <>
                Quality Biscuits & Provisions
                <br />Wholesale & Retail Supply
              </>
            }
        mobileTitle="Quality Biscuits & Provisions"
        subtitle="Your trusted source for biscuits, beverages, canned goods, and everyday household provisions. Whether you're buying in bulk or picking up a few items, we supply shops, distributors, and households with quality products at prices that work for wholesale and retail."
        buttons={[
          {
            label: "Shop Our Collection",
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
          { icon: Layout, position: "right" },
          { icon: Rocket, position: "center" },
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
            alt="Biscuits & Provisions Inventory Dashboard"
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