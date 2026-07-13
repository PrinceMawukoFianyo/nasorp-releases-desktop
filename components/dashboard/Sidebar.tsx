"use client";
// components/dashboard/Sidebar.tsx
// • Responsive: 220 px on md, 280 px on lg — hidden on mobile (sheet used instead)
// • MoMo live badge pulsing on the MoMo Payments link
// • Paystack Settings removed from accounting dropdown

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Logo from "../global/Logo";
import { ISidebarLink, sidebarLinks } from "@/config/sidebar";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { UserDropdownMenu } from "../UserDropdownMenu";
import { NotificationMenu, type StandardNotification } from "../NotificationMenu";

interface SidebarProps {
  session: Session;
  notifications?: StandardNotification[]; // fixed type to match NotificationMenu
  momoAlertCount?: number; // unread MoMo payment alerts
}

export default function Sidebar({
  session,
  notifications = [],
  momoAlertCount = 0,
}: SidebarProps) {
  const router = useRouter();
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const pathname = usePathname();
  const user = session.user;

  const hasPermission = (permission: string): boolean =>
    user.permissions?.includes(permission) ?? false;

  const filterSidebarLinks = (links: ISidebarLink[]): ISidebarLink[] =>
    links
      .filter((link) => hasPermission(link.permission))
      .map((link) => ({
        ...link,
        dropdownMenu: link.dropdownMenu?.filter((item) =>
          hasPermission(item.permission)
        ),
      }))
      .filter(
        (link) =>
          !link.dropdown || (link.dropdownMenu && link.dropdownMenu.length > 0)
      );

  const filteredLinks = filterSidebarLinks(sidebarLinks);

  async function handleLogout() {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.log(error);
    }
  }

  const isMoMoLink = (title: string) => title === "MoMo Payments";

  return (
    <div className="fixed top-0 left-0 h-full w-[220px] lg:w-[280px] border-r bg-muted/40 hidden md:block overflow-y-auto z-40">
      <div className="flex h-full max-h-screen flex-col gap-2">

        {/* ── Header ── */}
        <div className="flex flex-shrink-0 h-14 items-center justify-between border-b px-3 lg:h-[60px] lg:px-5">
          <Logo href="/dashboard" />
          <NotificationMenu notifications={notifications} />
        </div>

        {/* ── Nav links ── */}
        <div className="flex-1 overflow-y-auto px-2 lg:px-3 py-2">
            {filteredLinks.map((item, i) => {
              const Icon = item.icon;
              const isMomo = isMoMoLink(item.title);
              const isHrefIncluded =
                item.dropdownMenu &&
                item.dropdownMenu.some((link) => link.href === pathname);
              const isOpen = openDropdownIndex === i;

              return (
                <div key={i}>
                  {item.dropdown ? (
                    <Collapsible open={isOpen}>
                      <CollapsibleTrigger
                        onClick={() => setOpenDropdownIndex(isOpen ? null : i)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary w-full text-sm",
                          isHrefIncluded && "bg-muted text-primary"
                        )}
                      >
                        <Icon className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isMomo && "text-yellow-500"
                        )} />
                        <span className="flex-1 text-left truncate">{item.title}</span>

                        {/* MoMo alert badge */}
                        {isMomo && momoAlertCount > 0 && (
                          <span className="relative flex h-4 w-4 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 text-[9px] font-bold text-white items-center justify-center">
                              {momoAlertCount > 9 ? "9+" : momoAlertCount}
                            </span>
                          </span>
                        )}

                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="dark:bg-slate-950 rounded mt-0.5">
                        {item.dropdownMenu?.map((menuItem, j) => (
                          <Link
                            key={j}
                            href={menuItem.href}
                            className={cn(
                              "ml-5 flex items-center gap-2 rounded-lg px-3 py-1.5 text-muted-foreground transition-all hover:text-primary justify-between text-xs",
                              pathname === menuItem.href && "bg-muted text-primary"
                            )}
                          >
                            <span className="truncate">{menuItem.title}</span>
                            <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                              <Plus className="w-3 h-3" />
                            </span>
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Link
                      href={item.href ?? "#"}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm",
                        pathname === item.href && "bg-muted text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  )}
                </div>
              );
            })}

            {/* Live website external link */}
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Live Website</span>
            </Link>
        </div>

        {/* ── User menu ── */}
        <div className="flex-shrink-0 p-3 lg:p-4 border-t">
          <UserDropdownMenu
            username={session?.user?.name ?? ""}
            email={session?.user?.email ?? ""}
            avatarUrl={
              session?.user?.image ??
              "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20(54)-NX3G1KANQ2p4Gupgnvn94OQKsGYzyU.png"
            }
          />
        </div>
      </div>
    </div>
  );
}