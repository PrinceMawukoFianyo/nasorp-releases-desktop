import React from "react";
import {
  Package,
  BarChart3,
  AlertTriangle,
  FileText,
  Clock,
  Calculator,
  Users,
  Truck,
  Search,
  Zap,
  X,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface TimelineStep {
  title: string;
  highlight: string;
  duration: string;
  icon: React.ReactNode;
  painPoint: string;
  benefit: string;
}

const InventoryComparison = ({ theme = "light" }) => {
  const steps: TimelineStep[] = [
    {
      title: "Tracking",
      highlight: "Stock Levels",
      duration: "Daily manual counting",
      icon: <Package className="w-4 h-4" />,
      painPoint:
        "Manual stock counting, spreadsheet errors, and constant miscounts leading to overstocking or stockouts",
      benefit:
        "Real-time automated stock tracking with instant updates and accurate inventory levels",
    },
    {
      title: "Managing",
      highlight: "Low Stock Alerts",
      duration: "Often missed",
      icon: <AlertTriangle className="w-4 h-4" />,
      painPoint:
        "Missing low stock situations until it's too late, leading to lost sales and disappointed customers",
      benefit:
        "Automated low stock alerts and reorder notifications to prevent stockouts",
    },
    {
      title: "Generating",
      highlight: "Inventory Reports",
      duration: "Hours of work",
      icon: <FileText className="w-4 h-4" />,
      painPoint:
        "Spending hours manually creating reports, prone to errors and outdated information",
      benefit:
        "Instant detailed reports with analytics, trends, and actionable insights",
    },
    {
      title: "Processing",
      highlight: "Purchase Orders",
      duration: "Time consuming",
      icon: <Truck className="w-4 h-4" />,
      painPoint:
        "Manual purchase order creation, tracking deliveries, and managing supplier communications",
      benefit:
        "Automated purchase order generation with supplier management and delivery tracking",
    },
    {
      title: "Calculating",
      highlight: "Inventory Value",
      duration: "Complex calculations",
      icon: <Calculator className="w-4 h-4" />,
      painPoint:
        "Manual calculations of inventory worth, profit margins, and cost analysis prone to errors",
      benefit:
        "Automatic inventory valuation with profit margin analysis and cost tracking",
    },
    {
      title: "Managing",
      highlight: "Multiple Locations",
      duration: "Overwhelming",
      icon: <Users className="w-4 h-4" />,
      painPoint:
        "Juggling inventory across multiple locations with no central visibility or control",
      benefit:
        "Centralized multi-location inventory management with transfer tracking",
    },
    {
      title: "Searching",
      highlight: "Products & History",
      duration: "Frustrating searches",
      icon: <Search className="w-4 h-4" />,
      painPoint:
        "Digging through papers or spreadsheets to find product information and transaction history",
      benefit:
        "Instant product search with complete transaction history and analytics",
    },
    {
      title: "Monitoring",
      highlight: "Business Performance",
      duration: "Guesswork",
      icon: <TrendingUp className="w-4 h-4" />,
      painPoint:
        "Making business decisions based on gut feeling without proper data insights",
      benefit:
        "Comprehensive analytics dashboard with sales trends and performance metrics",
    },
  ];

  return (
    <section className="w-full bg-blue-50/20">
      {/* Header Section */}
      <div className="w-full max-w-6xl mx-auto py-20 px-6 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-8">
          Stop Wrestling With
          <br />
          <span className="inline-block bg-gradient-to-r from-red-100 via-orange-100 to-yellow-100 px-4 rounded-lg">
            Manual Inventory
          </span>
        </h2>

        <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          See how Inventory Pro transforms chaotic manual processes into 
          streamlined automated workflows that save time and prevent costly mistakes.
          <br />
          <span className="font-semibold text-blue-600">Join thousands of businesses already saving hours daily</span>
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Without Inventory Pro */}
          <div className="relative">
            <div className="sticky top-8 bg-white rounded-3xl border border-rose-100 overflow-hidden">
              <div className="p-6 border-b border-rose-100 bg-gradient-to-b from-rose-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                    <X className="w-5 h-5 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Manual Inventory Management
                  </h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-rose-500">
                    Chaotic & Error-Prone
                  </span>
                  <span className="text-slate-600">daily struggles</span>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-6">
                  {steps.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                        {step.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-slate-900">
                            {step.title}{" "}
                            <span className="font-bold">{step.highlight}</span>
                          </h4>
                          <span className="text-rose-500 text-sm">
                            {step.duration}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm">
                          {step.painPoint}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* With Inventory Pro */}
          <div className="relative">
            <div className="sticky top-8 bg-white rounded-3xl border border-emerald-100 overflow-hidden">
              <div className="p-6 border-b border-emerald-100 bg-gradient-to-b from-emerald-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    With Inventory Pro
                  </h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-500">
                    Smart & Automated
                  </span>
                  <span className="text-slate-600">inventory control</span>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-6">
                  {steps.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-slate-900">
                            {step.title}{" "}
                            <span className="font-bold">{step.highlight}</span>
                          </h4>
                          <ArrowRight className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-500 text-sm">
                            Automated
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm">{step.benefit}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl p-8 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Transform Your Inventory Management?
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Join thousands of businesses that have eliminated inventory chaos with Inventory Pro
            </p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
              Start Your Free Trial Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InventoryComparison;