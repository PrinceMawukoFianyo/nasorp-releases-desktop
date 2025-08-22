import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bug, Lightbulb, ThumbsUp, MessagesSquare, Plus } from "lucide-react";
import { getFeedback } from "@/actions/feedback";
import { Feedback, FeedbackType } from "@prisma/client";

import DeleteFeedback from "@/components/action-btns/delete-feedback";
import ApproveFeedback from "@/components/action-btns/approve-feedback";
import { AuthenticatedUser, getAuthenticatedUser } from "@/config/useAuth";

const feedbackTypeIcons = {
  BUG: <Bug className="w-4 h-4" />,
  FEATURE_REQUEST: <Lightbulb className="w-4 h-4" />,
  IMPROVEMENT: <ThumbsUp className="w-4 h-4" />,
  THANKS: <MessagesSquare className="w-4 h-4" />,
  OTHER: <MessagesSquare className="w-4 h-4" />,
};

const feedbackTypeColors = {
  BUG: "text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400",
  FEATURE_REQUEST:
    "text-purple-600 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-400",
  IMPROVEMENT:
    "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400",
  THANKS: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400",
  OTHER: "text-slate-600 bg-slate-100 dark:bg-slate-900/50 dark:text-slate-400",
};

const statusColors = {
  PENDING:
    "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400",
  IN_PROGRESS:
    "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400",
  COMPLETED:
    "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400",
  APPROVED:
    "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400",
  REJECTED: "text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400",
};
// Define the status type
type FeedbackStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "APPROVED";

// Type for feedback with included user data
type FeedbackWithUser = Feedback & {
  user: {
    name: string;
    image: string | null;
  };
};
export default async function FeedbackPage() {
  const all = await getFeedback();
  let feedback = all.filter((item) => item.status == "APPROVED");
  const user = await getAuthenticatedUser();
  const adminRole = user?.roles.find((role) => role.roleName === "admin");
  if (adminRole) {
    feedback = all;
  }
  const isUserAdmin = (user: AuthenticatedUser | null | undefined): boolean => {
    return user?.roles.some((role) => role.roleName === "admin") ?? false;
  };
  return (
    <div className="container max-w-4xl py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Community Feedback
          </h1>
          <p className="text-muted-foreground">
            See what others are suggesting and share your thoughts
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/settings/feedback">
            <Plus className="w-4 h-4 mr-2" />
            Add Feedback
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {feedback.map((item: FeedbackWithUser) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {item.user.image ? (
                    <img
                      src={item.user.image}
                      alt={item.user.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {item.user.name?.[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm ${feedbackTypeColors[item.type as FeedbackType]}`}
                      >
                        {
                          feedbackTypeIcons[
                            item.type as keyof typeof feedbackTypeIcons
                          ]
                        }
                        <span>{item.type.replace("_", " ")}</span>
                      </div>
                      <div
                        className={`px-2.5 py-0.5 rounded-full text-sm ${statusColors[item.status as FeedbackStatus]}`}
                      >
                        {item.status}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.content}</p>
              <div className="py-3 flex gap-4 items-center">
                {isUserAdmin(user) && <DeleteFeedback id={item.id} />}
                {isUserAdmin(user) && <ApproveFeedback id={item.id} />}
              </div>
            </CardContent>
          </Card>
        ))}

        {feedback.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No feedback submitted yet. Be the first to share your thoughts!
          </div>
        )}
      </div>
    </div>
  );
}
