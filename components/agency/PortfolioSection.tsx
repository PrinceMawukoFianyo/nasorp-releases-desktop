"use client";
import React, { useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

// Project categories
const categories = [
  "All",
  "Web Apps",
  "E-commerce",
  "Mobile Apps",
  "Dashboards",
];

const projects = [
  {
    title: "Finance Dashboard Platform",
    category: "Dashboards",
    description: "Modern analytics dashboard for financial institutions",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60",
    tags: ["React", "TypeScript", "Tailwind CSS"],
    link: "#",
  },
  {
    title: "E-commerce Fashion Store",
    category: "E-commerce",
    description: "Full-featured online fashion retail platform",
    image:
      "https://images.unsplash.com/photo-1491897554428-130a60dd4757?w=800&auto=format&fit=crop&q=60",
    tags: ["Next.js", "Stripe", "MongoDB"],
    link: "#",
  },
  {
    title: "Health & Fitness App",
    category: "Mobile Apps",
    description: "Cross-platform mobile app for fitness tracking",
    image:
      "https://images.unsplash.com/photo-1576153192396-180ecef2a715?w=800&auto=format&fit=crop&q=60",
    tags: ["React Native", "Firebase", "Node.js"],
    link: "#",
  },
  {
    title: "Real Estate Platform",
    category: "Web Apps",
    description: "Property management and listing platform",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60",
    tags: ["Vue.js", "Django", "PostgreSQL"],
    link: "#",
  },
  {
    title: "Education Management System",
    category: "Web Apps",
    description: "Comprehensive school management solution",
    image:
      "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop&q=60",
    tags: ["React", "Node.js", "MySQL"],
    link: "#",
  },
  {
    title: "Restaurant Order System",
    category: "Mobile Apps",
    description: "Mobile ordering system for restaurants",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=60",
    tags: ["Flutter", "Firebase", "Stripe"],
    link: "#",
  },
];

const PortfolioSection = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredProjects =
    activeCategory === "All"
      ? projects
      : projects.filter((project) => project.category === activeCategory);

  return (
    <section id="projects" className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Our Latest Projects
          </h2>
          <p className="text-xl text-gray-600">
            Explore our portfolio of successful projects and digital solutions
            we've delivered for our clients.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
                ${
                  activeCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
            >
              {/* Project Image */}
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
              </div>

              {/* Project Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-blue-300 mb-2">
                      {project.category}
                    </p>
                    <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      {project.description}
                    </p>
                  </div>
                  <a
                    href={project.link}
                    className="flex-shrink-0 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    <ArrowUpRight className="w-5 h-5 text-white" />
                  </a>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-3 py-1 bg-white/10 rounded-full text-xs backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <button className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
            View All Projects
            <ArrowUpRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
