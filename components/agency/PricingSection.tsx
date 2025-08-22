import React from "react";
import { Check, X, Zap } from "lucide-react";

const pricingPlans = [
  {
    name: "Starter",
    description: "Perfect for small businesses and startups.",
    price: "2,999",
    duration: "starting from",
    features: [
      { name: "Custom Website Design", included: true },
      { name: "Mobile Responsive", included: true },
      { name: "Content Management System", included: true },
      { name: "5 Pages", included: true },
      { name: "Contact Form", included: true },
      { name: "Social Media Integration", included: true },
      { name: "Basic SEO Setup", included: true },
      { name: "3 Months Support", included: true },
      { name: "E-commerce Features", included: false },
      { name: "Custom Functionality", included: false },
    ],
    popular: false,
    buttonText: "Get Started",
    color: "blue",
  },
  {
    name: "Professional",
    description: "Ideal for growing businesses and e-commerce.",
    price: "4,999",
    duration: "starting from",
    features: [
      { name: "Everything in Starter, plus:", included: true },
      { name: "E-commerce Integration", included: true },
      { name: "Up to 15 Pages", included: true },
      { name: "Advanced SEO Package", included: true },
      { name: "Payment Gateway Integration", included: true },
      { name: "Product Management System", included: true },
      { name: "Custom Animations", included: true },
      { name: "6 Months Support", included: true },
      { name: "Analytics Dashboard", included: true },
      { name: "Regular Backups", included: true },
    ],
    popular: true,
    buttonText: "Get Started",
    color: "purple",
  },
  {
    name: "Enterprise",
    description: "Custom solutions for large organizations.",
    price: "Custom",
    duration: "custom quote",
    features: [
      { name: "Everything in Professional, plus:", included: true },
      { name: "Custom Web Application", included: true },
      { name: "Advanced Security Features", included: true },
      { name: "API Development", included: true },
      { name: "Database Design", included: true },
      { name: "Third-party Integrations", included: true },
      { name: "Scalable Architecture", included: true },
      { name: "12 Months Support", included: true },
      { name: "Performance Optimization", included: true },
      { name: "Priority Support", included: true },
    ],
    popular: false,
    buttonText: "Contact Us",
    color: "emerald",
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Transparent Pricing for Your Needs
          </h2>
          <p className="text-xl text-gray-600">
            Choose the perfect plan that aligns with your business goals. No
            hidden fees.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`
                relative bg-white rounded-2xl p-8 
                transition-all duration-300
                ${
                  plan.popular
                    ? "ring-2 ring-purple-500 scale-105 shadow-xl"
                    : "hover:shadow-xl border border-gray-100"
                }
              `}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                  <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
                    <Zap className="w-4 h-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-2">
                  {plan.price !== "Custom" && (
                    <span className="text-gray-500">$</span>
                  )}
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{plan.duration}</span>
              </div>

              {/* Features List */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check
                        className={`w-5 h-5 text-${plan.color}-500 flex-shrink-0 mt-0.5`}
                      />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={
                        feature.included ? "text-gray-600" : "text-gray-400"
                      }
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <button
                className={`
                  w-full py-4 rounded-xl font-medium transition-all duration-300
                  ${
                    plan.popular
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                  }
                `}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            All plans include consultation, responsive design, and basic SEO
            setup.
          </p>
          <p className="text-sm text-gray-500">
            Need a custom solution?
            <button className="text-blue-600 font-medium ml-2 hover:text-blue-700">
              Contact our team
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
