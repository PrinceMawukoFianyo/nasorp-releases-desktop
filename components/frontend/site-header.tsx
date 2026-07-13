"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  UserCircle,
  BarChart3,
  Edit,
  BarChart4,
  Lock,
  Bell,
  Building,
  MapPin,
  Package2,
  Shield,
  ShoppingCart,
  TrendingUp,
  Truck,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";

import Logo from "../global/Logo";
import { Session } from "next-auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/generateInitials";

const features = [
  { icon: Package2, title: "Product Catalog Management", description: "Comprehensive product creation and management with SKU tracking, categorization, pricing, and minimum stock level settings.", href: "/features/product-catalog" },
  { icon: TrendingUp, title: "Real-time Inventory Tracking", description: "Monitor stock levels in real-time with automated low stock alerts, inventory history, and quantity tracking across all locations.", href: "/features/inventory-tracking" },
  { icon: MapPin, title: "Multi-location Management", description: "Track inventory across multiple store locations with seamless stock transfer capabilities and location-specific reporting.", href: "/features/multi-location" },
  { icon: Edit, title: "Stock Adjustments & History", description: "Record inventory changes with reason codes for damage, loss, or corrections. Maintain complete adjustment history.", href: "/features/stock-adjustments" },
  { icon: ShoppingCart, title: "Credit Sales Processing", description: "Create and fulfill customer orders with order status tracking, customer management, and automated invoice generation.", href: "/features/sales-orders" },
  { icon: UserCircle, title: "Customer Management", description: "Maintain customer database with contact information, addresses, and categorization for retail vs. wholesale clients.", href: "/features/customer-management" },
  { icon: Truck, title: "Purchase Order System", description: "Create and track supplier orders with receiving functionality, purchase order status tracking, and supplier management.", href: "/features/purchase-orders" },
  { icon: Building, title: "Supplier Management", description: "Comprehensive supplier database with product-supplier relationships and supplier performance tracking.", href: "/features/supplier-management" },
  { icon: BarChart3, title: "Essential Reporting", description: "Generate critical reports including inventory levels, low stock alerts, sales summaries, and purchase order status.", href: "/features/reporting" },
  { icon: Shield, title: "Role-based Access Control", description: "Secure user management with admin and standard user roles, customizable permissions, and audit trails.", href: "/features/user-management" },
  { icon: Bell, title: "Smart Notifications", description: "Automated alerts for low stock levels, order updates, and critical inventory events to keep operations running smoothly.", href: "/features/notifications" },
  { icon: BarChart4, title: "Inventory Analytics", description: "Track inventory performance with turnover rates, stock movement analysis, and demand forecasting insights.", href: "/features/analytics" },
];

export default function SiteHeader({ session }: { session: Session | null }) {
  const [open, setOpen] = React.useState(false);
  const [showFeatures, setShowFeatures] = React.useState(false);

  async function handleLogout() {
    await signOut();
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center space-x-4 min-w-0">
          <Logo />
          {/* FIX: was always visible, competing for space with the hamburger
              and the Dashboard button on mobile. Desktop-only now, matching
              how the login/signup buttons already behaved. */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/" className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {session ? (
          // FIX: this had no responsive guard at all — it showed on every
          // screen size, right next to the hamburger icon on mobile. Now
          // desktop-only; mobile users get the equivalent inside the Sheet.
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link href="/dashboard">
              <Avatar>
                <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
                <AvatarFallback>{getInitials(session?.user?.name)}</AvatarFallback>
              </Avatar>
              <span className="ml-3">Dashboard</span>
            </Link>
          </Button>
        ) : (
          <div className="hidden md:flex items-center space-x-4">
            <Button asChild variant="ghost">
              <Link href={"/login"}>Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Signup</Link>
            </Button>
          </div>
        )}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          {/* FIX: capped width on larger phones/small tablets instead of
              always being 100vw */}
          <SheetContent side="left" className="w-full sm:max-w-sm p-0 flex flex-col">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="text-left">
                {/* FIX: mobile drawer now greets a logged-in user by name
                    instead of just saying "Navigation" regardless of session */}
                {session ? `Hi, ${session.user?.name?.split(" ")[0] ?? "there"}` : "Navigation"}
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col py-4 overflow-y-auto flex-1">
              <Link href="/" className="px-4 py-2 text-lg font-medium hover:bg-accent" onClick={() => setOpen(false)}>
                Home
              </Link>

              {session && (
                // FIX: previously nothing here linked a logged-in user to
                // their dashboard from the mobile menu at all.
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-4 py-2 text-lg font-medium hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
              )}

              <button
                className="flex items-center justify-between px-4 py-2 text-lg font-medium hover:bg-accent text-left"
                onClick={() => setShowFeatures(!showFeatures)}
              >
                Features
                <ChevronDown className={cn("h-5 w-5 transition-transform", showFeatures && "rotate-180")} />
              </button>
              {showFeatures && (
                <div className="px-4 py-2 space-y-4">
                  {features.map((feature, index) => (
                    <Link
                      key={index}
                      href={`/feature/${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="flex items-start gap-4 py-2"
                      onClick={() => setOpen(false)}
                    >
                      <div className="p-2 bg-muted rounded-md shrink-0">
                        <feature.icon className="h-6 w-6 text-rose-500" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-medium mb-1">{feature.title}</h5>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/#pricing" className="px-4 py-2 text-lg font-medium hover:bg-accent" onClick={() => setOpen(false)}>
                Pricing
              </Link>
              <Link href="/how-it-works" className="px-4 py-2 text-lg font-medium hover:bg-accent" onClick={() => setOpen(false)}>
                How it works
              </Link>
            </div>

            {/* FIX: this footer used to ALWAYS show Login/Signup, even when
                the person was already logged in. Now it reflects session
                state, same as desktop does. */}
            <div className="border-t bg-background p-4">
              {session ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
                      <AvatarFallback>{getInitials(session?.user?.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{session.user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Button variant="outline" className="w-full" asChild onClick={() => setOpen(false)}>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button className="w-full" asChild onClick={() => setOpen(false)}>
                    <Link href="/register">Sign up</Link>
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}