// actions/showcase.ts
"use server";

import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";

export async function createShowcase(data: {
  title: string;
  description: string;
  projectUrl: string;
  githubUrl?: string;
  imageUrl: string;
  technology: string[];
  userId: string;
}) {
  try {
    const showcase = await db.showcase.create({
      data: {
        ...data,
        status: "PENDING",
      },
    });

    revalidatePath("/showcases");
    return { data: showcase };
  } catch (error) {
    console.error("Error creating showcase:", error);
    return { error: "Failed to create showcase" };
  }
}

export async function updateShowcaseStatus(
  id: string,
  status: "APPROVED" | "REJECTED"
) {
  try {
    const showcase = await db.showcase.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/showcases");
    // revalidatePath("/admin/showcases");
    return { data: showcase };
  } catch (error) {
    return { error: "Failed to update showcase status" };
  }
}

export async function getShowcases() {
  return await db.showcase.findMany({
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
export async function deleteShowcase(id: string) {
  await db.showcase.delete({
    where: {
      id,
    },
  });
  revalidatePath("/showcases");
  return {
    status: true,
  };
}
