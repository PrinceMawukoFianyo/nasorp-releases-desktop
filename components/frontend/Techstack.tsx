import React from "react";
import {
  Wrench,
  Hammer,
  Drill,
  Zap,
  Droplets,
  Settings,
  Phone,
  Clock,
  Home,
  Building2,
  ShoppingCart,
  Truck,
  Shield,
  Award,
  Users,
  Headphones,
  CheckCircle,
  AlertCircle
} from "lucide-react";

// Types and Interfaces
type ThemeType = "liUSt" | "dark";
type CategoryType = "services" | "products" | "emergency" | "support";

interface ServicesGridProps {
  theme?: ThemeType;
}

interface CategoryItem {
  name: string;
  icon: React.ReactNode;
  description?: string;
}

interface Category {
  title: string;
  type: CategoryType;
  items: CategoryItem[];
}

interface ThemeColors {
  wrapper: string;
  section: Record<CategoryType, string>;
  card: string;
  cardGlow: string;
  iconWrapper: Record<CategoryType, string>;
  title: Record<CategoryType, string>;
  text: string;
  icon: Record<CategoryType, string>;
  grid: string;
}

// Theme Styles
const themeStyles: Record<ThemeType, ThemeColors> = {
  liUSt: {
    wrapper: "bg-gray-50 border-gray-200",
    section: {
      services: "bg-rose-50/50",
      products: "bg-orange-50/50",
      emergency: "bg-red-50/50",
      support: "bg-green-50/50",
    },
    card: "bg-white hover:bg-gray-50 border border-gray-200/50",
    cardGlow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]",
    iconWrapper: {
      services: "bg-rose-100",
      products: "bg-orange-100",
      emergency: "bg-red-100",
      support: "bg-green-100",
    },
    title: {
      services: "text-rose-600",
      products: "text-orange-600",
      emergency: "text-red-600",
      support: "text-green-600",
    },
    text: "text-gray-600",
    icon: {
      services: "text-rose-500",
      products: "text-orange-500",
      emergency: "text-red-500",
      support: "text-green-500",
    },
    grid: "bg-[linear-gradient(to_right,#e5e7eb15_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb15_1px,transparent_1px)]",
  },
  dark: {
    wrapper: "bg-neutral-950 border-neutral-800",
    section: {
      services: "bg-rose-950/20",
      products: "bg-orange-950/20",
      emergency: "bg-red-950/20",
      support: "bg-green-950/20",
    },
    card: "bg-black hover:bg-neutral-900 border border-neutral-800/50",
    cardGlow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    iconWrapper: {
      services: "bg-rose-950/50",
      products: "bg-orange-950/50",
      emergency: "bg-red-950/50",
      support: "bg-green-950/50",
    },
    title: {
      services: "text-rose-300",
      products: "text-orange-300",
      emergency: "text-red-300",
      support: "text-green-300",
    },
    text: "text-gray-300",
    icon: {
      services: "text-rose-400",
      products: "text-orange-400",
      emergency: "text-red-400",
      support: "text-green-400",
    },
    grid: "bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]",
  },
};

// Category Data
const categories: Category[] = [
  {
    title: "Plumbing Services",
    type: "services",
    items: [
      { 
        name: "Pipe Repairs", 
        icon: <Wrench className="w-6 h-6" />,
        description: "Professional pipe repair & replacement"
      },
      { 
        name: "Drain Cleaning", 
        icon: <Droplets className="w-6 h-6" />,
        description: "Complete drain & sewer cleaning"
      },
      { 
        name: "Water Heaters", 
        icon: <Settings className="w-6 h-6" />,
        description: "Installation & maintenance"
      },
      { 
        name: "Fixture Install", 
        icon: <Home className="w-6 h-6" />,
        description: "Faucets, toilets, showers"
      },
      { 
        name: "Gas Lines", 
        icon: <Zap className="w-6 h-6" />,
        description: "Safe gas line services"
      },
      { 
        name: "Remodeling", 
        icon: <Building2 className="w-6 h-6" />,
        description: "Bathroom & kitchen plumbing"
      },
    ],
  },
  {
    title: "Hardware & Tools",
    type: "products",
    items: [
      { 
        name: "Power Tools", 
        icon: <Drill className="w-6 h-6" />,
        description: "DeWalt, Milwaukee, Makita"
      },
      { 
        name: "Hand Tools", 
        icon: <Hammer className="w-6 h-6" />,
        description: "Quality hand tools & sets"
      },
      { 
        name: "Fasteners", 
        icon: <Settings className="w-6 h-6" />,
        description: "Screws, bolts, anchors"
      },
      { 
        name: "Electrical", 
        icon: <Zap className="w-6 h-6" />,
        description: "Wiring & electrical supplies"
      },
      { 
        name: "Plumbing Parts", 
        icon: <Droplets className="w-6 h-6" />,
        description: "Pipes, fittings, fixtures"
      },
      { 
        name: "Paint Supplies", 
        icon: <ShoppingCart className="w-6 h-6" />,
        description: "Premium paints & brushes"
      },
    ],
  },
  {
    title: "Emergency Services",
    type: "emergency",
    items: [
      { 
        name: "24/7 Response", 
        icon: <Phone className="w-6 h-6" />,
        description: "Round-the-clock emergency calls"
      },
      { 
        name: "Burst Pipes", 
        icon: <AlertCircle className="w-6 h-6" />,
        description: "Immediate pipe burst repairs"
      },
      { 
        name: "No Hot Water", 
        icon: <Settings className="w-6 h-6" />,
        description: "Water heater emergency service"
      },
      { 
        name: "Blocked Drains", 
        icon: <Droplets className="w-6 h-6" />,
        description: "Emergency drain clearing"
      },
      { 
        name: "Gas Leaks", 
        icon: <Zap className="w-6 h-6" />,
        description: "Urgent gas leak detection & repair"
      },
      { 
        name: "Flooding", 
        icon: <AlertCircle className="w-6 h-6" />,
        description: "Water damage prevention"
      },
    ],
  },
  {
    title: "Customer Support",
    type: "support",
    items: [
      { 
        name: "Expert Advice", 
        icon: <Users className="w-6 h-6" />,
        description: "Free project consultations"
      },
      { 
        name: "Tool Rental", 
        icon: <Truck className="w-6 h-6" />,
        description: "Daily, weekly, monthly rates"
      },
      { 
        name: "Delivery", 
        icon: <Truck className="w-6 h-6" />,
        description: "Same-day local delivery"
      },
      { 
        name: "Warranty", 
        icon: <Shield className="w-6 h-6" />,
        description: "Service & parts warranty"
      },
      { 
        name: "Licensed Pro", 
        icon: <Award className="w-6 h-6" />,
        description: "Certified & insured technicians"
      },
      { 
        name: "Support", 
        icon: <Headphones className="w-6 h-6" />,
        description: "Customer service hotline"
      },
    ],
  },
];

// Component
const HardwarePlumbingGrid: React.FC<ServicesGridProps> = ({ theme = "liUSt" }) => {
  const style = themeStyles[theme];

  // Card Component
  const Card: React.FC<{
    item: CategoryItem;
    type: CategoryType;
    style: ThemeColors;
  }> = ({ item, type, style }) => (
    <div
      className={`
      relative flex flex-col items-center justify-center p-3 sm:p-4 
      ${style.card} ${style.cardGlow} rounded-xl 
      transition-all duration-300 cursor-pointer group
      overflow-hidden hover:scale-105
    `}
    >
      {/* Grid pattern background */}
      <div
        className={`absolute inset-0 ${style.grid}`}
        style={{
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(ellipse 80% 50% at 50% 50%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 50% at 50% 50%, black, transparent)",
        }}
      />

      {/* Icon with background */}
      <div
        className={`
        relative rounded-lg p-2 mb-2
        ${style.iconWrapper[type]}
        transform transition-transform duration-300 group-hover:scale-110
      `}
      >
        <div className={style.icon[type]}>{item.icon}</div>
      </div>

      <span
        className={`relative mt-2 text-xs sm:text-sm font-semibold ${style.text} text-center z-10`}
      >
        {item.name}
      </span>
      
      {item.description && (
        <span
          className={`relative mt-1 text-xs ${style.text} text-center z-10 opacity-70`}
        >
          {item.description}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-br from-gray-50 to-rose-50">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Everything you need for your <span className="text-rose-600">home</span> & <span className="text-orange-600">projects</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From emergency repairs to major renovations, we're your one-stop shop for quality tools, 
            reliable parts, and professional services.
          </p>
        </div>

        <div
          className={`w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 rounded-3xl border ${style.wrapper} transition-colors duration-300`}
        >
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {categories.map((category, idx) => (
              <div
                key={idx}
                className={`p-4 sm:p-6 rounded-2xl ${
                  style.section[category.type]
                } backdrop-blur-sm`}
              >
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className={`w-2 h-8 rounded-full mr-3 ${
                    category.type === 'services' ? 'bg-rose-500' :
                    category.type === 'products' ? 'bg-orange-500' :
                    category.type === 'emergency' ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <h2
                    className={`text-xl sm:text-2xl font-semibold ${
                      style.title[category.type]
                    }`}
                  >
                    {category.title}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {category.items.map((item, index) => (
                    <Card
                      key={index}
                      item={item}
                      type={category.type}
                      style={style}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Call (+233) 206-333-156
            </button>
            <button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Emergency: 24/7
            </button>
            <button className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-full font-semibold border border-gray-200 transition-all duration-300 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Visit Our Store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HardwarePlumbingGrid;