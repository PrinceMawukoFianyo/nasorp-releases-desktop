// app/showcases/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getShowcases } from "@/actions/showcases";

import DeleteShowcase from "@/components/action-btns/delete-showcase";
import ApproveShowcase from "@/components/action-btns/approve-showcase";
import { cn } from "@/lib/utils";
import { AuthenticatedUser, getAuthenticatedUser } from "@/config/useAuth";

export default async function ShowcasesPage() {
  const all = await getShowcases();
  let showcases = all.filter((item) => item.status == "APPROVED");
  const user = await getAuthenticatedUser();
  const adminRole = user?.roles.find((role) => role.roleName === "admin");
  if (adminRole) {
    showcases = all;
  }
  const isUserAdmin = (user: AuthenticatedUser | null | undefined): boolean => {
    return user?.roles.some((role) => role.roleName === "admin") ?? false;
  };
  return (
    <div className="container max-w-7xl py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Project Showcases
          </h1>
          <p className="text-muted-foreground">
            Discover what others have built with HubStack
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/settings/showcases">Submit Your Project</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {showcases.map((showcase) => (
          <Card
            key={showcase.id}
            className={cn(
              "overflow-hidden ",
              showcase.status == "REJECTED"
                ? "border border-red-500"
                : showcase.status == "PENDING"
                  ? "border border-yellow-500"
                  : ""
            )}
          >
            <a
              target="_blank"
              href={showcase.projectUrl ?? "#"}
              className="aspect-video relative block"
            >
              <img
                src={showcase.imageUrl}
                alt={showcase.title}
                className="object-cover w-full h-full"
              />
            </a>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">
                    <a target="_blank" href={showcase.projectUrl ?? "#"}>
                      {showcase.title}
                    </a>
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {showcase.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {showcase.technology.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-4">
                {isUserAdmin(user) && <DeleteShowcase id={showcase.id} />}
                {isUserAdmin(user) && <ApproveShowcase id={showcase.id} />}
              </div>
            </CardContent>
          </Card>
        ))}

        {showcases.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No showcases available yet. Be the first to submit your project!
          </div>
        )}
      </div>
    </div>
  );
}
