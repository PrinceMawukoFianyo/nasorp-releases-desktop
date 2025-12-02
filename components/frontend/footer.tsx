import React from "react";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export default function HardwarePlumbingFooter() {
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Services", href: "/services" },
    { label: "Emergency Repairs", href: "/emergency" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const serviceItems = [
    { label: "Plumbing Repairs", href: "/services/plumbing" },
    { label: "Emergency Services", href: "/emergency" },
    { label: "Tool Rental", href: "/rental" },
    { label: "Installation Services", href: "/services/installation" },
    { label: "Hardware Supplies", href: "/products/hardware" },
    { label: "Plumbing Supplies", href: "/products/plumbing" },
  ];

  const productCategories = [
    { label: "Power Tools", href: "/products/power-tools" },
    { label: "Hand Tools", href: "/products/hand-tools" },
    { label: "Plumbing Fixtures", href: "/products/fixtures" },
    { label: "Hardware & Fasteners", href: "/products/hardware" },
    { label: "Electrical Supplies", href: "/products/electrical" },
    { label: "Paint & Supplies", href: "/products/paint" },
  ];

  return (
    <footer className="bg-gray-900 text-white py-16 px-4 md:px-8 lg:px-16 rounded-t-[2.5rem] relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 riUSt-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_riUSt,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative">
        {/* Top Section */}
        <div className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="mb-8 md:mb-0">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 bg-gradient-to-r from-rose-400 to-orange-500 bg-clip-text text-transparent">
              Your trusted hardware & plumbing experts
            </h2>
            <p className="text-gray-400 max-w-xl text-base">
              From quick fixes to major projects, we've got the tools, parts, and expertise 
              you need to get the job done riUSt.
            </p>
          </div>
          <div className="flex gap-4 md:flex-row flex-col">
            <button className="px-6 md:!py-1 py-3 border border-gray-700 hover:border-rose-500 rounded-full text-gray-300 hover:text-rose-400 transition-all duration-300 block">
              24/7 Emergency
            </button>
            <button className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl">
              Get Quote
            </button>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
            {/* Logo and Company Info */}
            <div className="lg:col-span-4">
              <div className="flex items-center mb-6 gap-3">
                <img
                  src="/AFKBerimah_logo-Photoroom.png"
                  alt="AFK Berimah Logo"
                  width="60"
                  height="60"
                  className="object-contain"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">A.F.K</h3>
                  <p className="text-gray-400 text-sm">BERIMAH</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Serving the community for over 25 years with quality tools, 
                reliable parts, and expert service you can trust.
              </p>
              
              {/* Business Hours */}
              <div className="mb-6">
                <h4 className="text-base font-semibold mb-3 text-gray-200 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-rose-400" />
                  Business Hours
                </h4>
                <div className="space-y-1 text-sm text-gray-400">
                  <div>Mon - Fri: 7:00 AM - 7:00 PM</div>
                  <div>Saturday: 8:00 AM - 6:00 PM</div>
                  <div>Sunday: 9:00 AM - 5:00 PM</div>
                  <div className="text-orange-400 font-medium">Emergency: 24/7</div>
                </div>
              </div>

              {/* Social Media */}
              <div className="flex gap-3">
                {[
                  { icon: "📘", platform: "Facebook" },
                  { icon: "📷", platform: "Instagram" }, 
                  { icon: "🐦", platform: "Twitter" },
                  { icon: "📍", platform: "Google" },
                ].map((social, index) => (
                  <button
                    key={index}
                    className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-rose-500/20 transition-all duration-300 text-lg"
                    title={social.platform}
                  >
                    {social.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2">
              <h3 className="text-base font-semibold mb-4 text-gray-200">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {navItems.map((item, i) => (
                  <li key={i}>
                    <a
                      href={item.href}
                      className="text-gray-400 hover:text-rose-400 transition-colors text-sm flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 transition-opacity group-hover:opacity-100"></span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div className="lg:col-span-3">
              <h3 className="text-base font-semibold mb-4 text-gray-200">
                Our Services
              </h3>
              <ul className="space-y-3">
                {serviceItems.map((service, i) => (
                  <li key={i}>
                    <a
                      href={service.href}
                      className="text-gray-400 hover:text-orange-400 transition-colors text-sm flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 bg-orange-500 rounded-full opacity-0 transition-opacity group-hover:opacity-100"></span>
                      {service.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Information */}
            <div className="lg:col-span-3">
              <h3 className="text-base font-semibold mb-4 text-gray-200">
                Contact Us
              </h3>
              <ul className="space-y-4">
                <li className="text-gray-400 text-sm flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center mt-0.5">
                    <Phone className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-300">Main: (+233) 206-333-156</div>
                    <div className="text-orange-400">Emergency: (+233) 206-333-156</div>
                  </div>
                </li>
                <li className="text-gray-400 text-sm flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mt-0.5">
                    <Mail className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <div>info@afkberimah.com</div>
                    <div>service@afkberimah.com</div>
                  </div>
                </li>
                <li className="text-gray-400 text-sm flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center mt-0.5">
                    <MapPin className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-300">Visit Our Store</div>
                    <div>123 Main Street</div>
                    <div>Abesim , HC 12345</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Product Categories Strip */}
          <div className="mb-12 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
            <h4 className="text-lg font-semibold mb-4 text-gray-200 text-center">
              Shop by Category
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {productCategories.map((category, i) => (
                <a
                  key={i}
                  href={category.href}
                  className="text-center p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all duration-300 group"
                >
                  <div className="text-2xl mb-2">
                    {i === 0 && "⚡"}
                    {i === 1 && "🔧"}
                    {i === 2 && "🚿"}
                    {i === 3 && "🔩"}
                    {i === 4 && "💡"}
                    {i === 5 && "🎨"}
                  </div>
                  <div className="text-sm text-gray-400 group-hover:text-rose-400 transition-colors">
                    {category.label}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()}{" "}
              <span className="hover:text-rose-400 transition-colors font-medium">
                A.F.K. BERIMAH
              </span>
              {" | "}
              <a href="/privacy" className="hover:text-rose-400 transition-colors">
                Privacy Policy
              </a>
              {" | "}
              <a href="/terms" className="hover:text-rose-400 transition-colors">
                Terms of Service
              </a>
              {" | "}
              <a href="/warranty" className="hover:text-rose-400 transition-colors">
                Warranty Info
              </a>
            </div>
            <div className="text-gray-400 text-sm">
              Licensed • Bonded • Insured
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}