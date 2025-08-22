"use server";

import { db } from "@/prisma/db";
import { FeedbackType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createChangelog(data: {
  title: string;
  version: string;
  content: string;
  isPublished: boolean;
}) {
  try {
    const changelog = await db.changelog.create({
      data,
    });

    revalidatePath("/changelog");
    return { data: changelog };
  } catch (error) {
    return { error: "Failed to create changelog" };
  }
}

export async function createFeedback(data: {
  type: FeedbackType;
  title: string;
  content: string;
  userId: string;
}) {
  try {
    const feedback = await db.feedback.create({
      data: {
        ...data,
        status: "PENDING",
      },
    });

    revalidatePath("/feedback");
    return { data: feedback };
  } catch (error) {
    return { error: "Failed to submit feedback" };
  }
}
export async function getChangelogs() {
  return await db.changelog.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
export async function getFeedback() {
  return await db.feedback.findMany({
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
export async function deleteFeedback(id: string) {
  await db.feedback.delete({
    where: {
      id,
    },
  });
  revalidatePath("/feedback");
  return {
    status: true,
  };
}
export async function updateFeedbackStatus(
  id: string,
  status: "APPROVED" | "REJECTED"
) {
  try {
    const feedback = await db.feedback.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/showcases");
    // revalidatePath("/admin/showcases");
    return { data: feedback };
  } catch (error) {
    return { error: "Failed to update feedback status" };
  }
}
