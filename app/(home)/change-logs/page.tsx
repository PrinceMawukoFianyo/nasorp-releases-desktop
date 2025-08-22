import { getChangelogs } from "@/actions/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNormalDate } from "@/lib/getNormalDate";
import { formatDistanceToNow } from "date-fns";
export default async function ChangelogsPage() {
  const changelogs = await getChangelogs();

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Changelog</h1>
        <p className="text-muted-foreground">
          Keep track of updates and new features we're adding to HubStack
        </p>
      </div>

      <div className="space-y-6">
        {changelogs.map((log) => (
          <Card key={log.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{log.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                      {log.version}
                    </span>
                    <span>•</span>
                    <time>
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </time>
                    <p>{getNormalDate(log.createdAt)}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: log.content }}
              />
            </CardContent>
          </Card>
        ))}

        {changelogs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No changelogs available yet.
          </div>
        )}
      </div>
    </div>
  );
}
