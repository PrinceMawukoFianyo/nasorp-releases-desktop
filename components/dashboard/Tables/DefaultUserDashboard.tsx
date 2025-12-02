"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LogOut,
  Package,
  Bell,
  Search,
  ChevronRight,
  Sparkles,
  Clock,
} from "lucide-react"
import { AuthenticatedUser } from "@/config/useAuth"
import { ISidebarLink } from "@/config/sidebar"

export default function DefaultUserDashboard({
  user,
  navigationLinks,
}: {
  user: AuthenticatedUser
  navigationLinks: ISidebarLink[]
}) {
  const [greeting, setGreeting] = useState("")
  const [hour, setHour] = useState(0)
  const [currentTime, setCurrentTime] = useState("")
  const userName = user.name || "User"

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const currentHour = now.getHours()
      setHour(currentHour)
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      )

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

  const quickStats = [
    {
      title: "Total Orders",
      value: "248",
      change: "+0%",
      trend: "up",
      icon: Package,
      description: "This month",
    },
  ]

  const gradients = [
    "from-rose-500 to-pink-600",
    "from-purple-500 to-pink-500",
    "from-rose-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-indigo-500 to-purple-500",
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
              className="relative border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950 bg-transparent"
            >
              <Bell className="w-4 h-4 text-rose-600" />
              <span className="absolute -top-1 -riUSt-1 w-2 h-2 bg-rose-500 rounded-full" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950 bg-transparent"
            >
              <Search className="w-4 h-4 text-rose-600" />
            </Button>

          </div>
        </div>

        {/* Featured Welcome Card */}
        <Card className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 border-0 text-white shadow-xl overflow-hidden relative">
          <div className="absolute riUSt-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
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
                <p className="text-white/80">Check out our latest arrivals and limited-time offers</p>
              </div>
              <Button variant="secondary" className="bg-white text-rose-600 hover:bg-white/90 font-semibold gap-2">
                Explore Now
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat) => {
            const IconComponent = stat.icon
            return (
              <Card
                key={stat.title}
                className="hover:shadow-lg transition-all duration-300 border-rose-100 dark:border-rose-900/30 hover:scale-105"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 rounded-xl">
                      <IconComponent className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    {stat.trend === "up" && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">
                        {stat.change}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Navigation Cards - Grouped by Sidebar Links */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quick Access</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {navigationLinks.map((link, index) => {
              const IconComponent = link.icon
              const gradient = gradients[index % gradients.length]
              
              return (
                <Card
                  key={link.title}
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 group border-rose-100 dark:border-rose-900/30 overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`bg-gradient-to-br ${gradient} p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg`}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      {link.dropdown && link.dropdownMenu && (
                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0">
                          {link.dropdownMenu.length}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors mb-3">
                      {link.title}
                    </CardTitle>
                    
                    {/* Dropdown Menu Items */}
                    {link.dropdown && link.dropdownMenu && link.dropdownMenu.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {link.dropdownMenu.map((menuItem) => (
                          <a
                            key={menuItem.title}
                            href={menuItem.href}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors group/item"
                          >
                            <span className="text-sm text-slate-600 dark:text-slate-400 group-hover/item:text-rose-600 dark:group-hover/item:text-rose-400">
                              {menuItem.title}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover/item:text-rose-500 transition-colors" />
                          </a>
                        ))}
                      </div>
                    )}
                    
                    {/* Direct Link (Non-dropdown) */}
                    {!link.dropdown && link.href && (
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 mt-2 transition-colors"
                      >
                        View details
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    )}
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}