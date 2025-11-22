"use client";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Package,
  BarChart3,
  AlertTriangle,
  Truck,
  Users,
  Calculator,
  Search,
  Smartphone,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";

const InventoryFeatureTabs = () => {
  const features = [
    {
      id: "inventory-tracking",
      icon: Package,
      tab: "Stock Tracking",
      title: "Real-Time Inventory Tracking",
      description:
        "Monitor your inventory levels in real-time with automated stock updates and accurate quantity tracking.",
      subFeatures: [
        "Real-time stock level monitoring across all locations",
        "Automatic inventory updates with each transaction",
        "Barcode scanning for quick product identification",
        "Batch and serial number tracking for detailed control",
        "Multi-location inventory management",
        "Stock movement history and audit trails",
        "Integration with point-of-sale systems",
        "Mobile-friendly interface for warehouse operations",
      ],
    },
    {
      id: "alerts",
      icon: AlertTriangle,
      tab: "Smart Alerts",
      title: "Intelligent Stock Alerts",
      description:
        "Never run out of stock again with customizable alerts and automated reorder notifications.",
      subFeatures: [
        "Low stock alerts with customizable thresholds",
        "Overstock notifications to prevent excess inventory",
        "Automated reorder point calculations",
        "Seasonal demand forecasting and alerts",
        "Email and SMS notification options",
        "Critical stock alerts for high-priority items",
        "Expiry date alerts for perishable products",
        "Custom alert rules based on business needs",
      ],
    },
    {
      id: "analytics",
      icon: BarChart3,
      tab: "Analytics",
      title: "Advanced Analytics Dashboard",
      description:
        "Make data-driven decisions with comprehensive inventory analytics and detailed reporting.",
      subFeatures: [
        "Real-time inventory value and cost analysis",
        "Sales velocity and turnover rate tracking",
        "Profit margin analysis by product and category",
        "Seasonal trends and demand forecasting",
        "ABC analysis for inventory prioritization",
        "Dead stock identification and recommendations",
        "Supplier performance metrics and analytics",
        "Custom reports with exportable data formats",
      ],
    },
    {
      id: "suppliers",
      icon: Truck,
      tab: "Suppliers",
      title: "Supplier Management",
      description:
        "Streamline your supply chain with comprehensive supplier management and purchase order automation.",
      subFeatures: [
        "Complete supplier database with contact details",
        "Automated purchase order generation",
        "Supplier performance tracking and ratings",
        "Lead time monitoring and optimization",
        "Price comparison across multiple suppliers",
        "Purchase history and payment tracking",
        "Integration with supplier catalogs and pricing",
        "Delivery tracking and receipt confirmation",
      ],
    },
    {
      id: "users",
      icon: Users,
      tab: "User Management",
      title: "Role-Based User Access",
      description:
        "Control access to your inventory system with role-based permissions and user management.",
      subFeatures: [
        "Role-based access control with custom permissions",
        "Employee activity tracking and audit logs",
        "Multi-level approval workflows for transactions",
        "Individual user dashboards and preferences",
        "Time-based access restrictions",
        "Integration with existing HR systems",
        "Secure authentication with two-factor options",
        "User performance metrics and reporting",
      ],
    },
    {
      id: "valuation",
      icon: Calculator,
      tab: "Valuation",
      title: "Inventory Valuation & Costing",
      description:
        "Accurate inventory valuation using multiple costing methods with automated calculations.",
      subFeatures: [
        "Multiple costing methods (FIFO, LIFO, Weighted Average)",
        "Real-time inventory value calculations",
        "Cost basis tracking for each product batch",
        "Profit margin analysis and pricing optimization",
        "Landed cost calculations including shipping and duties",
        "Write-off and adjustment tracking",
        "Financial reporting integration",
        "Tax-compliant inventory valuation reports",
      ],
    },
    {
      id: "search",
      icon: Search,
      tab: "Search & Filter",
      title: "Advanced Search & Filtering",
      description:
        "Find products instantly with powerful search capabilities and intelligent filtering options.",
      subFeatures: [
        "Lightning-fast product search with autocomplete",
        "Advanced filtering by category, supplier, location",
        "Barcode and SKU-based product lookup",
        "Custom product tags and categorization",
        "Search history and saved filter presets",
        "Bulk actions on filtered product lists",
        "Product comparison and analysis tools",
        "Integration with mobile scanning devices",
      ],
    },
    {
      id: "mobile",
      icon: Smartphone,
      tab: "Mobile App",
      title: "Mobile Inventory Management",
      description:
        "Manage your inventory on-the-go with our fully-featured mobile application.",
      subFeatures: [
        "Native mobile app for iOS and Android",
        "Offline capability with data synchronization",
        "Built-in barcode and QR code scanner",
        "Photo capture for product documentation",
        "GPS tracking for location-based inventory",
        "Voice-to-text for quick data entry",
        "Push notifications for critical alerts",
        "Seamless sync with web dashboard",
      ],
    },
    {
      id: "reports",
      icon: FileText,
      tab: "Reports",
      title: "Comprehensive Reporting",
      description:
        "Generate detailed reports for better business insights and regulatory compliance.",
      subFeatures: [
        "Pre-built report templates for common needs",
        "Custom report builder with drag-and-drop interface",
        "Scheduled automated report generation",
        "Export options (PDF, Excel, CSV)",
        "Visual charts and graphs for data presentation",
        "Regulatory compliance reports",
        "Multi-location consolidated reporting",
        "Real-time report sharing and collaboration",
      ],
    },
  ];

  return (
    <section className="w-full py-20 bg-rose-50/30">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto px-6 mb-16 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6">
          Everything You Need for
          <br /> 
          <span className="inline-block bg-gradient-to-r from-rose-200 via-emerald-200 to-teal-300 px-4 rounded-lg">
            Smart Inventory Management
          </span>
        </h2>
        <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto">
          From real-time tracking to advanced analytics,
          <br /> Inventory Pro has all the features to optimize your operations.
        </p>
      </div>

      {/* Tabs Component */}
      <div className="w-full max-w-6xl mx-auto px-6">
        <Tabs defaultValue="inventory-tracking" className="w-full">
          {/* Tab Buttons */}
          <TabsList className="flex items-center w-full gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-full shadow-sm mb-8 flex-wrap justify-center">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <TabsTrigger
                  key={feature.id}
                  value={feature.id}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full data-[state=active]:bg-rose-100 data-[state=active]:text-rose-900 transition-all duration-300 text-slate-600"
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden md:inline font-medium">
                    {feature.tab}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Content Panels */}
          {features.map((feature) => (
            <TabsContent
              key={feature.id}
              value={feature.id}
              className="focus-visible:outline-none focus-visible:ring-0"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100"
              >
                <div className="flex items-start gap-6">
                  {/* Feature Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-emerald-50 flex items-center justify-center shadow-sm">
                    <feature.icon className="w-8 h-8 text-rose-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-slate-600 text-lg">
                        {feature.description}
                      </p>
                    </div>
                    <ul className="space-y-4">
                      {feature.subFeatures.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-1">
                            <svg
                              className="w-3 h-3 text-rose-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <span className="text-slate-700 text-lg">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default InventoryFeatureTabs;