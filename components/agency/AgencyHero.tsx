import React from "react";
import { ArrowRight, Code, Rocket, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <div className="relative min-h-screen pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Pill Label */}
          <div className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4 mr-2" />
            Web Development Agency
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            We Build Digital Products That
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              Make an Impact
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Transform your ideas into reality with our expert team of developers
            and designers. We create stunning websites and powerful web
            applications.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors group">
              Start Your Project
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              View Our Work
            </button>
          </div>

          {/* Stats Section */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Code, label: "Projects Completed", value: "150+" },
              { icon: Rocket, label: "Successful Launches", value: "98%" },
              { icon: Sparkles, label: "Client Satisfaction", value: "100%" },
            ].map((stat, index) => (
              <div
                key={index}
                className="flex flex-col items-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100 hover:border-blue-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
