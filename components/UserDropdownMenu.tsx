"use client";
// components/UserDropdownMenu.tsx
// Account → /dashboard/settings/profile
// Billing → /dashboard/accounting?tab=billing
// Notifications → /dashboard/notifications
// MoMo alert badge on bell icon when momoAlertCount > 0

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  CreditCard,
  LogOut,
  Settings,
  Sparkles,
  ChevronsUpDown,
  Smartphone,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserDropdownProps {
  username: string;
  email: string;
  avatarUrl?: string;
  momoAlertCount?: number;
  notificationCount?: number;
}

export function UserDropdownMenu({
  username,
  email,
  avatarUrl,
  momoAlertCount = 0,
  notificationCount = 0,
}: UserDropdownProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.log(error);
    }
  }

  const totalAlerts = momoAlertCount + notificationCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-12 w-full justify-start gap-2 px-4"
        >
          {/* Avatar */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={username} />
            <AvatarFallback>{username[0]}</AvatarFallback>
          </Avatar>

          {/* Name + email */}
          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-sm font-medium truncate max-w-[120px]">{username}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{email}</span>
          </div>

          {/* Alert dot when there are unread alerts */}
          {totalAlerts > 0 && (
            <span className="absolute top-2 right-8 h-2 w-2 rounded-full bg-yellow-500 ring-2 ring-background" />
          )}

          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        {/* Upgrade banner */}
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/accounting?tab=billing")}
          className="cursor-pointer text-purple-600 focus:text-purple-700 focus:bg-purple-50"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span>Upgrade to Pro</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* Account */}
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/dashboard/settings/profile" className="flex items-center w-full">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account</span>
            </Link>
          </DropdownMenuItem>

          {/* Billing */}
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/dashboard/accounting?tab=billing" className="flex items-center w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </Link>
          </DropdownMenuItem>

          {/* Notifications */}
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/dashboard/notifications" className="flex items-center w-full">
              <div className="relative mr-2">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </div>
              <span>Notifications</span>
              {notificationCount > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{notificationCount}</span>
              )}
            </Link>
          </DropdownMenuItem>

          {/* MoMo shortcut */}
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/dashboard/momo" className="flex items-center w-full">
              <div className="relative mr-2">
                <Smartphone className="h-4 w-4 text-yellow-500" />
                {momoAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-500 text-[8px] font-bold text-white flex items-center justify-center">
                    {momoAlertCount > 9 ? "9+" : momoAlertCount}
                  </span>
                )}
              </div>
              <span>MoMo Payments</span>
              {momoAlertCount > 0 && (
                <span className="ml-auto text-xs font-semibold text-yellow-600">{momoAlertCount} new</span>
              )}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}