// Target path: app/(dashboard)/dashboard/no-access/page.tsx
//
// Only reached if a logged-in user's role has no permissions matching
// any sidebar route at all (e.g. a brand-new role with nothing assigned
// yet). Friendlier than a blank page or a redirect loop.

export default function NoAccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-semibold mb-2">No access assigned yet</h2>
        <p className="text-sm text-muted-foreground">
          Your account doesn&apos;t have permission to view any pages yet.
          Please contact your administrator to have a role assigned.
        </p>
      </div>
    </div>
  );
}