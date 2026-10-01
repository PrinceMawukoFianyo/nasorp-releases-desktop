import type { Role } from "@/generated/prisma-client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    roles?: Role[];
    orgId?: string | null;
    orgName?: string | null;
    permissions?: string[];
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      roles?: Role[];
      orgId?: string | null;
      orgName?: string | null;
      permissions?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    roles?: Role[];
    orgId?: string | null;
    orgName?: string | null;
    permissions?: string[];
  }
}