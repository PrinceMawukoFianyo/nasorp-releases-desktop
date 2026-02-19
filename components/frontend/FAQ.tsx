"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, HelpCircle, Minus, Plus } from "lucide-react";

const faqs = [
  {
    question: "Do you offer plumbing installation services or just sell parts?",
    answer:
      "We offer both! We have a full range of plumbing supplies, tools, and fixtures available for purchase, plus we provide professional installation services. Our certified plumbers can handle everything from simple faucet repairs to complete bathroom renovations and water heater installations. You can buy parts for DIY projects or hire our team for professional installation.",
  },
  {
    question: "What brands of tools and hardware do you carry?",
    answer:
      "We stock premium brands including DeWalt, Milwaukee, Makita, Bosch, and Craftsman for power tools. For plumbing, we carry Kohler, Delta, Moen, American Standard, and PEX systems. Our hardware selection includes Schlage, Kwikset, Stanley, and commercial-grade fasteners. We focus on quality brands that professionals trust and homeowners can rely on.",
  },
  {
    question: "Do you have emergency plumbing services available?",
    answer:
      "Yes, we offer 24/7 emergency plumbing services for urgent issues like burst pipes, major leaks, clogged drains, and water heater failures. Our emergency team is equipped with fully stocked service vehicles and can handle most repairs on the spot. Emergency service rates apply for after-hours, weekend, and holiday calls.",
  },
  {
    question: "Can you help me figure out what parts I need for my project?",
    answer:
      "Absolutely! Our experienced staff can help identify the right parts for your project. Bring in photos, old parts, or detailed descriptions of what you're working on. We offer free consultations and can provide project estimates, recommend tools, and suggest the best materials for your specific needs and budget.",
  },
  {
    question: "Do you offer delivery services for large orders?",
    answer:
      "Yes, we provide delivery services for orders over $100 within a 15-mile radius. For larger items like water heaters, lumber, or bulk materials, we offer same-day or next-day delivery. Delivery fees vary by distance and order size. We also offer contractor accounts with scheduled delivery options for ongoing projects.",
  },
  {
    question: "What's your return policy on tools and hardware?",
    answer:
      "We offer a 30-day return policy on most items with original receipt and packaging. Power tools have a 90-day return window. Custom-cut materials, special orders, and used plumbing fixtures cannot be returned for health and safety reasons. Defective items can be exchanged or refunded regardless of time frame with manufacturer warranty coverage.",
  },
  {
    question: "Do you rent tools and equipment?",
    answer:
      "Yes, we have a full tool rental department with daily, weekly, and monthly rates. We rent everything from basic hand tools and drain snakes to heavy equipment like pipe threading machines, sewer cameras, and excavation tools. All rental tools are maintained and inspected regularly. We require a valid ID and credit card for rentals.",
  },
  {
    question: "Can you match prices from other hardware stores?",
    answer:
      "We offer competitive pricing and will match verified prices from local competitors on identical items. Bring in the competitor's current advertisement or quote, and we'll match it. Price matching applies to in-stock items only and excludes special promotions, clearance items, and contractor pricing. Online-only retailers are evaluated case by case.",
  },
  {
    question: "Do you provide estimates for plumbing work?",
    answer:
      "Yes, we provide free estimates for most plumbing projects. For simple repairs, we can often give estimates over the phone or in-store. For larger projects like bathroom remodels or whole-house re-piping, we'll schedule an on-site visit to assess the work and provide a detailed written estimate. Emergency service calls include a diagnostic fee that's applied toward repair costs.",
  },
];

export default function HardwarePlumbingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 bg-rose-50">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-rose-600 mb-2 uppercase tracking-wide">
            Frequently Asked Questions
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Got questions? We've got <span className="italic">answers</span>
          </h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border overflow-hidden shadow-sm"
            >
              <button
                className="w-full text-left p-4 focus:outline-none hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  {openIndex === index ? (
                    <Minus className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  ) : (
                    <Plus className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-4 pt-0 text-gray-600">{faq.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <HelpCircle className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-gray-600">Still have questions?</span>
          </div>
          <button className="bg-orange-400 text-white px-6 py-2 rounded-full hover:bg-orange-500 transition duration-300 flex items-center font-semibold">
            Call us today
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </section>
  );
}