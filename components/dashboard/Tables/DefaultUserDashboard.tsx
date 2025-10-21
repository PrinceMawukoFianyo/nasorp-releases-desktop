"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, 
  Grid3x3, 
  LogOut, 
  Users, 
  BarChart3, 
  Download, 
  Share2, 
  Settings,
  TrendingUp,
  Package,
  Heart,
  Bell,
  Search,
  ChevronRight,
  Sparkles,
  Clock
} from "lucide-react"
//import { progress } from "@components/ui/progress";

interface AuthenticatedUser {
  name: string
  email?: string
  avatar?: string
}

export default function DefaultUserDashboard({user}: {user: AuthenticatedUser}) {
  const [greeting, setGreeting] = useState("")
  const [hour, setHour] = useState(0)
  const [currentTime, setCurrentTime] = useState("")
  const userName = user.name

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const currentHour = now.getHours()
      setHour(currentHour)
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }))

      if (currentHour < 12) {
        setGreeting("Good Morning")
      } else if (currentHour < 18) {
        setGreeting("Good Afternoon")
      } else {
        setGreeting("Good Evening")
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const navigationLinks = [
    {
      title: "Categories",
      description: "Browse all product categories",
      icon: Grid3x3,
      href: "/categories",
      gradient: "from-rose-400 to-pink-500",
      count: "24",
    },
    {
      title: "Products",
      description: "View all available products",
      icon: ShoppingCart,
      href: "/products",
      gradient: "from-pink-400 to-rose-500",
      count: "156",
    },
    {
      title: "Customers",
      description: "Manage customer information",
      icon: Users,
      href: "/customers",
      gradient: "from-rose-500 to-red-500",
      count: "89",
    },
    {
      title: "Analytics",
      description: "View sales and performance metrics",
      icon: BarChart3,
      href: "/analytics",
      gradient: "from-pink-500 to-rose-600",
      count: "New",
    },
  ]

  const quickStats = [
    {
      title: "Total Orders",
      value: "248",
      change: "+12.5%",
      trend: "up",
      icon: Package,
      description: "This month",
    },
    {
      title: "Revenue",
      value: "$12,456",
      change: "+8.2%",
      trend: "up",
      icon: TrendingUp,
      description: "Last 30 days",
    },
    {
      title: "Saved Items",
      value: "32",
      change: "+4",
      trend: "up",
      icon: Heart,
      description: "In wishlist",
    },
    {
      title: "Active Deals",
      value: "16",
      change: "Live now",
      trend: "neutral",
      icon: Sparkles,
      description: "Trending",
    },
  ]

  const recentActivity = [
    { action: "New order placed", time: "2 min ago", type: "order" },
    { action: "Customer feedback received", time: "15 min ago", type: "feedback" },
    { action: "Product restocked", time: "1 hour ago", type: "inventory" },
    { action: "Sale ended successfully", time: "3 hours ago", type: "sale" },
  ]

  const quickActions = [
    {
      title: "Download Report",
      description: "Export analytics",
      icon: Download,
      action: () => console.log("Download report"),
    },
    {
      title: "Share Dashboard",
      description: "Send to team",
      icon: Share2,
      action: () => console.log("Share dashboard"),
    },
    {
      title: "Settings",
      description: "Configure preferences",
      icon: Settings,
      action: () => console.log("Open settings"),
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 dark:from-slate-950 dark:via-rose-950/10 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                {greeting}, {userName}!
              </h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {currentTime}
              </span>
              <span>•</span>
              <span>Welcome back to your dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon"
              className="relative border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950"
            >
              <Bell className="w-4 h-4 text-rose-600" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon"
              className="border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950"
            >
              <Search className="w-4 h-4 text-rose-600" />
            </Button>
            
            <Button 
              variant="outline" 
              className="gap-2 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline text-rose-600">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Featured Welcome Card */}
        <Card className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 border-0 text-white shadow-xl overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute left-0 bottom-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <CardContent className="pt-8 pb-8 relative z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-90">Featured</span>
                </div>
                <h2 className="text-2xl font-bold">
                  {hour < 12
                    ? "Start your day with amazing discoveries!"
                    : hour < 18
                      ? "Discover trending products and exclusive deals!"
                      : "Explore our special evening collections!"}
                </h2>
                <p className="text-white/80">
                  Check out our latest arrivals and limited-time offers
                </p>
              </div>
              <Button 
                variant="secondary" 
                className="bg-white text-rose-600 hover:bg-white/90 font-semibold gap-2"
              >
                Explore Now
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Main Navigation Cards */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quick Access</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {navigationLinks.map((link) => {
              const IconComponent = link.icon
              return (
                <Card
                  key={link.title}
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 group border-rose-100 dark:border-rose-900/30 overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`bg-gradient-to-br ${link.gradient} p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0">
                        {link.count}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
                      {link.title}
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      {link.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Activity & Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="border-rose-100 dark:border-rose-900/30">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => {
                const IconComponent = action.icon
                return (
                  <Button
                    key={action.title}
                    onClick={action.action}
                    variant="outline"
                    className="w-full justify-start h-auto p-4 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 hover:border-rose-300 group"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg group-hover:bg-rose-200 dark:group-hover:bg-rose-900/50 transition-colors">
                        <IconComponent className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {action.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                    </div>
                  </Button>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}