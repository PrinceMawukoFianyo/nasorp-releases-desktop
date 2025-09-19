import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  StarIcon,
  ShoppingCartIcon,
  Package,
  Wrench,
  Building,
  Zap,
} from "lucide-react";

const HardwareStoreShowcase = ({ theme = "light" }) => {
  const isDark = theme === "dark";
  
  const products = [
    {
      id: 1,
      name: "Steel Rect Pipe 2x4 inch",
      description: "Heavy duty rectangular steel pipe for construction",
      image: "🔧",
      price: 45.50,
      originalPrice: 68.25,
      discount: 33,
      rating: 4.8,
      sold: 156,
      category: "Steel Pipes",
      icon: Package,
    },
    {
      id: 2,
      name: "PVC Pipe Fittings Set",
      description: "Complete set of PVC elbows, tees, and reducers",
      image: "🔩",
      price: 28.75,
      originalPrice: 42.30,
      discount: 32,
      rating: 4.6,
      sold: 89,
      category: "Plumbing",
      icon: Wrench,
    },
    {
      id: 3,
      name: "Round Metal Pipe 3 inch",
      description: "Galvanized round pipe for plumbing applications",
      image: "⚙️",
      price: 52.80,
      originalPrice: 75.40,
      discount: 30,
      rating: 4.9,
      sold: 203,
      category: "Metal Pipes",
      icon: Building,
    },
    {
      id: 4,
      name: "Pipe Reducer Kit",
      description: "Assorted reducers for different pipe sizes",
      image: "🔌",
      price: 19.95,
      originalPrice: 29.90,
      discount: 33,
      rating: 4.5,
      sold: 67,
      category: "Fittings",
      icon: Zap,
    },
    {
      id: 5,
      name: "Building Hardware Set",
      description: "Essential bolts, screws, and fasteners",
      image: "🏗️",
      price: 35.60,
      originalPrice: 48.75,
      discount: 27,
      rating: 4.7,
      sold: 124,
      category: "Hardware",
      icon: Building,
    },
    {
      id: 6,
      name: "Decorative Pipe Covers",
      description: "Stylish covers for exposed pipes and fittings",
      image: "✨",
      price: 22.40,
      originalPrice: 31.20,
      discount: 28,
      rating: 4.4,
      sold: 45,
      category: "Decorative",
      icon: Package,
    },
  ];

  return (
    <div
      id="products"
      className={`w-full max-w-7xl mx-auto p-8 ${isDark ? "bg-slate-900" : "bg-white"}`}
    >
      {/* Header Section */}
      <div className="text-center mb-12">
        <h2
          className={`text-4xl md:text-5xl font-extrabold tracking-tight mb-4 ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          Featured Building Materials
        </h2>
        <p
          className={`text-xl leading-relaxed max-w-3xl mx-auto ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          Quality steel pipes, plumbing fittings, and building materials at unbeatable prices.
          Professional-grade supplies for contractors and DIY enthusiasts.
        </p>
        
        {/* Category Badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            Bundle Deals Available
          </Badge>
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            Limited Time Offers
          </Badge>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            In Stock Now
          </Badge>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {products.map((product) => {
          const Icon = product.icon;
          const savings = product.originalPrice - product.price;
          
          return (
            <Card
              key={product.id}
              className={`group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-blue-200 ${
                isDark
                  ? "bg-slate-800/50 border-slate-700"
                  : "bg-white border-slate-200"
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      isDark ? "bg-slate-700" : "bg-slate-50"
                    }`}
                  >
                    {product.image}
                  </div>
                  <Badge className="bg-red-500 text-white text-sm font-bold px-2 py-1">
                    -{product.discount}%
                  </Badge>
                </div>
                
                <div>
                  <Badge variant="outline" className="mb-2 text-xs">
                    {product.category}
                  </Badge>
                  <h3
                    className={`text-lg font-bold mb-2 line-clamp-2 ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {product.name}
                  </h3>
                  <p
                    className={`text-sm line-clamp-2 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {product.description}
                  </p>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Price Section */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xl font-black ${
                        isDark ? "text-emerald-400" : "text-emerald-600"
                      }`}
                    >
                      GHS{product.price}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm line-through ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      GHS{product.originalPrice}
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">
                      You save GHS{savings.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Rating and Sales */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      {product.rating}
                    </span>
                  </div>
                  <span
                    className={`text-sm ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {product.sold} sold
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  className={`w-full h-12 text-base font-semibold group-hover:scale-105 transition-transform duration-200 ${
                    isDark
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  } text-white shadow-lg hover:shadow-xl`}
                >
                  <ShoppingCartIcon className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom CTA Section */}
      <div
        className={`text-center p-8 rounded-2xl ${
          isDark
            ? "bg-gradient-to-r from-slate-800 to-slate-700"
            : "bg-gradient-to-r from-blue-50 to-emerald-50"
        }`}
      >
        <h3
          className={`text-2xl font-bold mb-4 ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          Need Bulk Orders or Custom Solutions?
        </h3>
        <p
          className={`text-lg mb-6 ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          Contact our team for contractor pricing, bulk discounts, and custom building material solutions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            className={`px-8 py-3 text-lg font-semibold ${
              isDark
                ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            } text-white shadow-lg hover:shadow-xl transition-all duration-200`}
          >
            Request Bulk Quote
          </Button>
          <Button
            variant="outline"
            className={`px-8 py-3 text-lg font-semibold border-2 ${
              isDark
                ? "border-slate-500 text-slate-300 hover:bg-slate-700"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            } transition-all duration-200`}
          >
            Browse All Products
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HardwareStoreShowcase;