"use server"
// actions/patch-phone-scanner-permission.ts
//
// One-time (safe to re-run) patch: adds `pos.phone_scanner` to any existing
// DB role that already manages POS (has pos.update, pos.access, or
// pos.create). New roles created after this change will already have it if
// you tick it in RoleForm — this is only needed for roles saved *before*
// the permission existed. Mirrors the shape of patchAccountingPermissions
// in actions/roles.ts so it can plug into the same UI pattern.

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"

const PHONE_SCANNER_PERMISSIONS = ["pos.phone_scanner"]

// A role only qualifies for auto-granting if it already manages POS at all —
// this avoids silently handing a brand-new capability to read-only/basic
// roles that never had POS management rights in the first place.
const POS_MANAGEMENT_PERMISSIONS = ["pos.update", "pos.access", "pos.create"]

export async function patchPhoneScannerPermission() {
  try {
    const user = await getAuthenticatedUser()

    const roles = await db.role.findMany({
      where: { orgId: user.orgId },
    })

    const results: { role: string; added: string[]; skipped: string[] }[] = []

    for (const role of roles) {
      const current = new Set(role.permissions)
      const managesPOS = POS_MANAGEMENT_PERMISSIONS.some((p) => current.has(p))

      const added: string[] = []
      const skipped: string[] = []

      if (managesPOS) {
        for (const perm of PHONE_SCANNER_PERMISSIONS) {
          if (current.has(perm)) {
            skipped.push(perm)
          } else {
            current.add(perm)
            added.push(perm)
          }
        }
      }

      if (added.length > 0) {
        await db.role.update({
          where: { id: role.id },
          data: { permissions: Array.from(current) },
        })
      }

      results.push({
        role: role.displayName ?? role.roleName,
        added,
        skipped,
      })
    }

    revalidatePath("/dashboard/settings/roles")
    return { success: true, results }
  } catch (error: any) {
    console.error("patchPhoneScannerPermission error:", error)
    return { success: false, error: error.message }
  }
}