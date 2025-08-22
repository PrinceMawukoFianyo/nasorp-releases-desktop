import React from "react";
import Image from "next/image";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "CEO at TechFlow",
    company: "TechFlow Solutions",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&auto=format&fit=crop&q=60",
    quote:
      "The team delivered exceptional results. Our new web application has significantly improved our business processes and customer satisfaction.",
    stars: 5,
    project: "Enterprise Dashboard",
  },
  {
    name: "Michael Chen",
    role: "Founder",
    company: "EcoStore",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&auto=format&fit=crop&q=60",
    quote:
      "They transformed our e-commerce vision into reality. The attention to detail and user experience design is outstanding.",
    stars: 5,
    project: "E-commerce Platform",
  },
  {
    name: "Emma Davis",
    role: "Marketing Director",
    company: "HealthPlus",
    image:
      "https://images.unsplash.com/photo-1553837851-341a0c2509e5?w=400&h=400&auto=format&fit=crop&q=60",
    quote:
      "The mobile app they developed has received amazing feedback from our users. Their process was transparent and efficient.",
    stars: 5,
    project: "Healthcare App",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-gray-50 relative overflow-hidden">
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
            Client Success Stories
          </h2>
          <p className="text-xl text-gray-600">
            Don't just take our word for it. Here's what our clients have to say
            about working with us.
          </p>
        </div>

        {/* Featured Testimonial */}
        <div className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg relative overflow-hidden">
            <Quote className="absolute top-8 right-8 w-24 h-24 text-blue-50" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-current text-yellow-400"
                    />
                  ))}
                </div>
                <blockquote className="text-2xl font-medium text-gray-900 mb-6">
                  "Working with their team was a game-changer for our business.
                  The custom CRM system they built has streamlined our
                  operations and improved customer satisfaction by 150%."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&auto=format&fit=crop&q=60"
                      alt="David Wilson"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      David Wilson
                    </h4>
                    <p className="text-gray-600">CTO at GlobalTech Solutions</p>
                  </div>
                </div>
              </div>
              <div className="relative h-64 md:h-full rounded-xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop&q=60"
                  alt="Project Screenshot"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(testimonial.stars)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-current text-yellow-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-600 mb-6">
                "{testimonial.quote}"
              </blockquote>

              {/* Project Tag */}
              <div className="mb-6">
                <span className="inline-block px-4 py-1 rounded-full bg-blue-50 text-blue-600 text-sm">
                  {testimonial.project}
                </span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <button className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
            Start Your Success Story
          </button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
