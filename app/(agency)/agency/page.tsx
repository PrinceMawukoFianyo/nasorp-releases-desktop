import Hero from "@/components/agency/AgencyHero";
import BlogListing from "@/components/agency/BlogListing";
import PortfolioSection from "@/components/agency/PortfolioSection";
import PricingSection from "@/components/agency/PricingSection";
import ProcessSection from "@/components/agency/ProcessSection";
import ServicesSection from "@/components/agency/ServicesSection";
import TestimonialsSection from "@/components/agency/Testimonials";
import React from "react";

export default function page() {
  return (
    <div>
      <Hero />
      <ServicesSection />
      <PortfolioSection />
      <ProcessSection />
      <TestimonialsSection />
      <PricingSection />
      <BlogListing />
    </div>
  );
}
