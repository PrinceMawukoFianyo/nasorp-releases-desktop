import React from "react";
import Image from "next/image";
import { Users, Code, Trophy, Target, Heart, Sparkles } from "lucide-react";

const stats = [
  { label: "Years Experience", value: "5+" },
  { label: "Projects Completed", value: "100+" },
  { label: "Team Members", value: "25+" },
  { label: "Client Satisfaction", value: "100%" },
];

const values = [
  {
    icon: Heart,
    title: "Passion",
    description:
      "We're passionate about creating exceptional digital experiences that make a difference.",
  },
  {
    icon: Target,
    title: "Excellence",
    description:
      "We strive for excellence in every line of code and pixel we deliver.",
  },
  {
    icon: Users,
    title: "Collaboration",
    description:
      "We believe in working closely with our clients to achieve the best results.",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    description:
      "We stay ahead of the curve with the latest technologies and best practices.",
  },
];

const teamMembers = [
  {
    name: "Alex Thompson",
    role: "Founder & CEO",
    image:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=400&auto=format&fit=crop&q=60",
    socialLinks: { linkedin: "#", twitter: "#" },
  },
  {
    name: "Sarah Chen",
    role: "Lead Designer",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&auto=format&fit=crop&q=60",
    socialLinks: { linkedin: "#", twitter: "#" },
  },
  {
    name: "Michael Rodriguez",
    role: "Tech Lead",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&auto=format&fit=crop&q=60",
    socialLinks: { linkedin: "#", twitter: "#" },
  },
  {
    name: "Emily Parker",
    role: "Project Manager",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&auto=format&fit=crop&q=60",
    socialLinks: { linkedin: "#", twitter: "#" },
  },
];

const AboutSection = () => {
  return (
    <section className="py-28 bg-gray-50 relative overflow-hidden ">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-12 mb-20">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Building Digital Excellence Since{" "}
              <span className="text-blue-600">2019</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              We're a team of passionate developers, designers, and digital
              craftsmen dedicated to transforming ideas into powerful digital
              solutions. Our journey began with a simple mission: to help
              businesses thrive in the digital age.
            </p>
            <div className="grid grid-cols-2 gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-4 bg-white rounded-xl shadow-sm"
                >
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-1/2">
            <div className="relative h-[400px] rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=60"
                alt="Team at work"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Our Values
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {value.title}
                </h4>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Meet Our Team
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="relative h-64">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h4 className="text-lg font-semibold">{member.name}</h4>
                    <p className="text-sm text-gray-200">{member.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Call to Action */}
          <div className="mt-20 text-center">
            <button className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
              Join Our Team
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
