import React from "react";
import {
  Search,
  PenTool,
  Code2,
  Rocket,
  Shield,
  BarChart,
  ChevronRight,
} from "lucide-react";

const processSteps = [
  {
    icon: Search,
    title: "Discovery & Planning",
    description:
      "We start by understanding your business goals, target audience, and project requirements through in-depth consultations.",
    details: [
      "Requirements gathering",
      "Market research",
      "Project scope definition",
      "Timeline planning",
    ],
    color: "blue",
  },
  {
    icon: PenTool,
    title: "Design & Prototyping",
    description:
      "Creating intuitive user interfaces and experiences that align with your brand and user needs.",
    details: [
      "UI/UX design",
      "Wireframing",
      "Interactive prototypes",
      "Design system creation",
    ],
    color: "purple",
  },
  {
    icon: Code2,
    title: "Development",
    description:
      "Building your solution using modern technologies and best practices for optimal performance.",
    details: [
      "Frontend development",
      "Backend implementation",
      "Database architecture",
      "API integration",
    ],
    color: "emerald",
  },
  {
    icon: Shield,
    title: "Testing & QA",
    description:
      "Rigorous testing to ensure your product works flawlessly across all devices and use cases.",
    details: [
      "Quality assurance",
      "Cross-browser testing",
      "Performance optimization",
      "Security testing",
    ],
    color: "amber",
  },
  {
    icon: Rocket,
    title: "Deployment",
    description:
      "Launching your product with careful attention to performance and security considerations.",
    details: [
      "Server setup",
      "Domain configuration",
      "SSL implementation",
      "Performance monitoring",
    ],
    color: "pink",
  },
  {
    icon: BarChart,
    title: "Support & Growth",
    description:
      "Ongoing maintenance and optimization to ensure your product continues to evolve and succeed.",
    details: [
      "Regular updates",
      "Performance tracking",
      "Analytics reporting",
      "Growth optimization",
    ],
    color: "indigo",
  },
];

const ProcessSection = () => {
  return (
    <section id="process" className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Gradient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How We Work
          </h2>
          <p className="text-xl text-gray-600">
            Our proven development process ensures successful project delivery
            and exceeds client expectations.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {processSteps.map((step, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* Step Number */}
              <div
                className={`
    absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-all duration-300
  `}
              >
                <span className="text-xl font-bold text-white transform -rotate-12 group-hover:rotate-0 transition-transform duration-300">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
              </div>

              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-xl bg-${step.color}-50 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300`}
              >
                <step.icon className={`w-7 h-7 text-${step.color}-500`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 mb-6">{step.description}</p>

              {/* Details */}
              <ul className="space-y-3">
                {step.details.map((detail, detailIndex) => (
                  <li
                    key={detailIndex}
                    className="flex items-center text-sm text-gray-600"
                  >
                    <ChevronRight
                      className={`w-4 h-4 mr-2 text-${step.color}-500`}
                    />
                    {detail}
                  </li>
                ))}
              </ul>

              {/* Hover Border */}
              <div
                className={`absolute inset-0 border-2 border-transparent rounded-2xl group-hover:border-${step.color}-200 transition-colors duration-300`}
              ></div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-6">
            Ready to start your project with us?
          </p>
          <button className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
            Start Your Project
            <ChevronRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
