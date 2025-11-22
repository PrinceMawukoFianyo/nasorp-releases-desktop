"use server";
import { getAuthenticatedUser } from "@/config/useAuth";
import { generateAPIKey } from "@/lib/generateAPIKey";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";

export async function createAPIKey(name: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return {
        success: false,
        data: null,
        error: "You are Not Authorized",
      };
    }
    const apiKey = generateAPIKey();

    const existingKey = await db.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (existingKey) {
      return {
        success: false,
        data: null,
        error: "This Key Already exists",
      };
    }
    console.log(apiKey);
    const newApiKey = await db.apiKey.create({
      data: {
        orgId: user.orgId,
        key: apiKey,
        name,
        isActive: true, // Make sure this field exists in your schema
      },
    });
    revalidatePath("/dashboard/integrations/api");

    return {
      success: true,
      data: newApiKey,
      error: null,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      data: null,
      error: "Something went wrong",
    };
  }
}

export async function getOrgApiKeys(orgId: string) {
  try {
    const keys = await db.apiKey.findMany({
      where: {
        orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return keys;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getOrgKey(orgId: string): Promise<string | null | undefined> {
  try {
    if (!orgId) {
      console.error("❌ getOrgKey: No orgId provided");
      return null;
    }

    console.log("🔍 Fetching API key for orgId:", orgId);

    const key = await db.apiKey.findFirst({
      where: {
        orgId,
      },
    });

    if (!key) {
      console.warn("⚠️ No API key found in database for orgId:", orgId);
      return null;
    }

    console.log("✅ API key found for orgId:", orgId);
    
    // ✅ Return the key - adjust field name based on your schema
    // Common field names: key, value, apiKey, token
    return key.key || null;
  } catch (error) {
    console.error("❌ getOrgKey database error:", error);
    
    // Return null so fallback can be used
    return null;
  }
}


export async function revokeAPIKey(id: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return {
        success: false,
        error: "You are Not Authorized",
      };
    }

    await db.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
    
    revalidatePath("/dashboard/integrations/api");
    return {
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Failed to revoke API key",
    };
  }
}

export async function reactivateAPIKey(id: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return {
        success: false,
        error: "You are Not Authorized",
      };
    }

    await db.apiKey.update({
      where: { id },
      data: { isActive: true },
    });
    
    revalidatePath("/dashboard/integrations/api");
    return {
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Failed to reactivate API key",
    };
  }
}

export async function deleteAPIKey(id: string) {
  try {
    await db.apiKey.delete({
      where: {
        id,
      },
    });
    revalidatePath("/dashboard/integrations/api");
    return {
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
    };
  }
}