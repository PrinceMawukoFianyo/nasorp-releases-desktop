"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Grid3x3, LogOut, Users, BarChart3, Download, Share2, Settings } from "lucide-react"
import { AuthenticatedUser } from "@/config/useAuth"

export default function DefaultUserDashboard({user}:{user:AuthenticatedUser}) {
  const [greeting, setGreeting] = useState("")
  const [hour, setHour] = useState(0)

  useEffect(() => {
    const now = new Date()
    const currentHour = now.getHours()
    setHour(currentHour)

    if (currentHour < 12) {
      setGreeting("Good Morning")
    } else if (currentHour < 18) {
      setGreeting("Good Afternoon")
    } else {
      setGreeting("Good Evening")
    }
  }, [])

  const userName = "Alex Johnson"

  const navigationLinks = [
    {
      title: "Categories",
      description: "Browse all product categories",
      icon: Grid3x3,
      href: "/categories",
      color: "bg-blue-500",
    },
    {
      title: "Products",
      description: "View all available products",
      icon: ShoppingCart,
      href: "/products",
      color: "bg-purple-500",
    },
    {
      title: "Customers",
      description: "Manage customer information",
      icon: Users,
      href: "/customers",
      color: "bg-green-500",
    },
    {
      title: "Analytics",
      description: "View sales and performance metrics",
      icon: BarChart3,
      href: "/analytics",
      color: "bg-orange-500",
    },
  ]

  const quickActions = [
    {
      title: "Download Report",
      icon: Download,
      action: () => console.log("Download report"),
    },
    {
      title: "Share Dashboard",
      icon: Share2,
      action: () => console.log("Share dashboard"),
    },
    {
      title: "Settings",
      icon: Settings,
      action: () => console.log("Open settings"),
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                {greeting}, {userName}!
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">Welcome back to your dashboard</p>
            </div>
            <Button variant="outline" size="lg" className="gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>

          {/* Welcome Card */}
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 border-0 text-white">
            <CardContent className="pt-6">
              <p className="text-lg font-medium">
                {hour < 12
                  ? "Start your day by exploring our latest products!"
                  : hour < 18
                    ? "Keep shopping and discover amazing deals!"
                    : "Wind down and browse our evening specials!"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Links Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Explore</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {navigationLinks.map((link) => {
              const IconComponent = link.icon
              return (
                <Card
                  key={link.title}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`${link.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-xl text-slate-900 dark:text-white">{link.title}</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">{link.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      asChild
                      className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      <a href={link.href}>Explore {link.title}</a>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">24</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">+2 this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Saved Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">12</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Ready to purchase</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const IconComponent = action.icon
              return (
                <Card key={action.title} className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="pt-6">
                    <Button
                      onClick={action.action}
                      variant="outline"
                      className="w-full h-24 flex flex-col items-center justify-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent"
                    >
                      <IconComponent className="w-6 h-6" />
                      <span className="text-sm font-medium">{action.title}</span>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
