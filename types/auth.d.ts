import "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      orgName?: string
      orgId?: string
      role?: string
      permissions?: string[]
      firstName?: string
      lastName?: string
      phone?: string
      roles?: any[]
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    orgName?: string
    orgId?: string
    role?: string
    permissions?: string[]
    firstName?: string
    lastName?: string
    phone?: string
    roles?: any[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    orgName?: string
    orgId?: string
    role?: string
    permissions?: string[]
    firstName?: string
    lastName?: string
    phone?: string
    roles?: any[]
  }
}
