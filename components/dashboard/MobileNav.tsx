"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ISidebarLink, sidebarLinks } from "@/config/sidebar";
import { Session } from "next-auth";

interface MobileNavProps {
  session: Session;
  onNavigate?: () => void;
  momoAlertCount?: number;
}

// FIX: this is the SAME grouped/collapsible nav logic that used to live only
// in Sidebar.tsx. Navbar.tsx had its own separate flattened version, which is
// why mobile showed every dropdown item ungrouped with no way to collapse
// "Accounting". Now both desktop and mobile render this exact component, so
// they can never drift apart again.
export default function MobileNav({
  session,
  onNavigate,
  momoAlertCount = 0,
}: MobileNavProps) {
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
  const isMoMoLink = (title: string) => title === "MoMo Payments";

  return (
    <nav className="grid items-start text-sm font-medium gap-0.5">
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
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isMomo && "text-yellow-500"
                    )}
                  />
                  <span className="flex-1 text-left truncate">{item.title}</span>

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
                <CollapsibleContent className="rounded mt-0.5">
                  {item.dropdownMenu?.map((menuItem, j) => (
                    <Link
                      key={j}
                      href={menuItem.href}
                      onClick={onNavigate}
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
                onClick={onNavigate}
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

      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm"
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">Live Website</span>
      </Link>
    </nav>
  );
}