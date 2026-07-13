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
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 sm:gap-4 border-b bg-muted/60 px-3 sm:px-4 lg:h-[60px] lg:px-6 overflow-hidden">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col w-[280px] sm:w-[320px] overflow-y-auto">
          <div className="mb-2">
            <Logo href="/dashboard" />
          </div>
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

      {/* FIX: single flex-1 + min-w-0 so this row can actually shrink instead
          of forcing the whole header (and page) wider than the viewport */}
      <div className="flex-1 min-w-0">
        {orgName && (
          <div className="font-medium flex items-center gap-1.5 sm:gap-3 min-w-0">
            <span className="text-sm text-foreground truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
              {orgName}
            </span>
            {userRole && (
              <>
                <span className="hidden sm:inline text-sm text-muted-foreground">|</span>
                <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[140px]">
                  {userRole}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* FIX: removed the two redundant empty flex-1 spacer divs — one
          flex-1 on the org-name block above is enough to push this to the
          right edge */}
      <div className="shrink-0">
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