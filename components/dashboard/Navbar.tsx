"use client";
import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Session } from "next-auth";
import Logo from "../global/Logo";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { UserDropdownMenu } from "../UserDropdownMenu";
import MobileNav from "./MobileNav";

interface NavbarProps {
  session: Session & {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string | null;
      orgName?: string | null;
      orgId?: string | null;
      roles?: Array<{ displayName: string }>;
    };
  };
  momoAlertCount?: number;
}

export default function Navbar({ session, momoAlertCount = 0 }: NavbarProps) {
  const router = useRouter();
  // FIX: Sheet is now controlled so we can close it automatically after
  // tapping a link — previously it stayed open until you manually hit X.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const user = session?.user;

  async function handleLogout() {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.log(error);
    }
  }

  const userRole = user?.roles?.[0]?.displayName ?? user?.role ?? "";
  const orgName = user?.orgName ?? "";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-muted/60 px-4 lg:h-[60px] lg:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        {/* FIX: explicit width + overflow-y-auto so a long, fully-grouped
            menu (with all dropdowns) scrolls properly on short phone screens
            instead of getting clipped. */}
        <SheetContent side="left" className="flex flex-col w-[280px] sm:w-[320px] overflow-y-auto">
          <div className="mb-2">
            <Logo href="/dashboard" />
          </div>

          {/* FIX: was a flattened, ungrouped mobileLinks list — now renders
              the same grouped/collapsible nav as desktop. */}
          <MobileNav
            session={session}
            momoAlertCount={momoAlertCount}
            onNavigate={() => setMobileNavOpen(false)}
          />

          <div className="mt-auto pt-4">
            <Button onClick={handleLogout} size="sm" className="w-full">
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        {orgName && (
          <div className="font-medium flex gap-3 items-center whitespace-nowrap">
            <span className="text-ms text-foreground whitespace-nowrap">{orgName}</span>
            <span className="text-sm text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{userRole}</span>
          </div>
        )}
      </div>
      <div className="flex-1"></div>

      <div className="w-full flex-1"></div>
      <div className="p-4">
        <UserDropdownMenu
          username={session?.user?.name ?? ""}
          email={session?.user?.email ?? ""}
          avatarUrl={
            session?.user?.image ??
            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20(54)-NX3G1KANQ2p4Gupgnvn94OQKsGYzyU.png"
          }
        />
      </div>
    </header>
  );
}