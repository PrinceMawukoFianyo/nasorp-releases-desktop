import React from "react";
import {
  Laptop,
  LayoutGrid,
  ShoppingCart,
  Smartphone,
  GitBranch,
  BarChart,
  LucideIcon,
} from "lucide-react";
// Define color variants type
type ColorVariant = "blue" | "purple" | "emerald" | "pink" | "amber" | "indigo";

// Define service interface
interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  color: ColorVariant;
}

// Define color variants interface
interface ColorVariants {
  [key: string]: string;
}

// Define ServiceCard props interface
interface ServiceCardProps {
  service: Service;
}
const services: Service[] = [
  {
    icon: Laptop,
    title: "Web Development",
    description:
      "Building fast, responsive, and user-friendly websites using modern technologies and best practices.",
    features: [
      "Custom Web Applications",
      "Frontend Development",
      "Backend Systems",
      "API Integration",
    ],
    color: "blue",
  },
  {
    icon: LayoutGrid,
    title: "UI/UX Design",
    description:
      "Creating beautiful and intuitive user interfaces that deliver exceptional user experiences.",
    features: ["User Research", "Wireframing", "Visual Design", "Prototyping"],
    color: "purple",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce Solutions",
    description:
      "Developing secure and scalable online stores that drive sales and growth.",
    features: [
      "Custom E-commerce",
      "Payment Integration",
      "Inventory Management",
      "Shopping Cart",
    ],
    color: "emerald",
  },
  {
    icon: Smartphone,
    title: "Mobile Development",
    description:
      "Building cross-platform mobile applications that work seamlessly across devices.",
    features: [
      "React Native",
      "iOS Development",
      "Android Development",
      "Mobile UI",
    ],
    color: "pink",
  },
  {
    icon: GitBranch,
    title: "Custom Software",
    description:
      "Developing tailored software solutions to meet your specific business needs.",
    features: [
      "CRM Systems",
      "ERP Solutions",
      "Cloud Applications",
      "Database Design",
    ],
    color: "amber",
  },
  {
    icon: BarChart,
    title: "Digital Strategy",
    description:
      "Creating comprehensive digital strategies to help your business grow online.",
    features: [
      "Market Research",
      "SEO Optimization",
      "Analytics",
      "Performance Metrics",
    ],
    color: "indigo",
  },
];

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const colorVariants = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600",
    purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-600",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600",
    pink: "bg-pink-50 text-pink-600 group-hover:bg-pink-600",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-600",
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600",
  };

  return (
    <div className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-xl ${colorVariants[service.color]} flex items-center justify-center transition-colors duration-300 mb-6`}
      >
        <service.icon className="w-7 h-7 group-hover:text-white transition-colors duration-300" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
      <p className="text-gray-600 mb-6">{service.description}</p>

      {/* Features */}
      <ul className="space-y-3">
        {service.features.map((feature, index) => (
          <li key={index} className="flex items-center text-sm text-gray-600">
            <span
              className={`w-1.5 h-1.5 rounded-full ${colorVariants[service.color]} mr-2`}
            ></span>
            {feature}
          </li>
        ))}
      </ul>

      {/* Hover Border */}
      <div
        className={`absolute inset-0 border-2 border-transparent rounded-2xl group-hover:border-${service.color}-200 transition-colors duration-300`}
      ></div>
    </div>
  );
};

const ServicesSection = () => {
  return (
    <section
      id="services"
      className="py-20 bg-gray-50 relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Our Expertise & Services
          </h2>
          <p className="text-xl text-gray-600">
            We offer a comprehensive range of digital services to help your
            business thrive in the digital world.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard key={index} service={service} />
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-6">
            Need a custom solution? Let's discuss your project requirements.
          </p>
          <button className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
