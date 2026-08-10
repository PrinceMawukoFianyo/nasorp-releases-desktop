// Target path: lib/permissions/getLandingRoute.ts
//
// Reuses your existing sidebarLinks config (config/sidebar.ts) as the
// single source of truth for "what pages exist and what permission guards
// each one" — so this stays in sync automatically whenever you add/remove
// sidebar links, instead of maintaining a second hardcoded route list.

import { sidebarLinks, type ISidebarLink } from "@/config/sidebar";

// Flatten top-level links + nested dropdown items into one ordered list of
// { href, permission } candidates, preserving sidebar order (order matters:
// first match wins, so put your most "default" pages first in sidebarLinks).
function flattenLinks(links: ISidebarLink[]): { href: string; permission: string }[] {
  const result: { href: string; permission: string }[] = [];

  for (const link of links) {
    if (link.dropdown && link.dropdownMenu?.length) {
      for (const item of link.dropdownMenu) {
        if (item.href && item.permission) {
          result.push({ href: item.href, permission: item.permission });
        }
      }
    } else if (link.href && link.permission) {
      result.push({ href: link.href, permission: link.permission });
    }
  }

  return result;
}

/**
 * Given a user's permission list, return the href of the first sidebar
 * route they're allowed to see. Falls back to `/dashboard/no-access` if
 * they have zero matching permissions (e.g. a newly created role with
 * nothing assigned yet) — create that page as a friendly "contact your
 * admin" screen rather than letting them hit a broken/blank route.
 */
export function getFirstAccessibleRoute(userPermissions: string[] = []): string {
  const candidates = flattenLinks(sidebarLinks);

  const match = candidates.find((c) => userPermissions.includes(c.permission));
  return match?.href ?? "/dashboard/no-access";
}