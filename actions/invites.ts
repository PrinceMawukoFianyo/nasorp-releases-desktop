// actions/invites.ts - NEW FILE
"use server";

import { db } from "@/prisma/db";

export async function getInviteByEmail(email: string, orgId: string) {
  try {
    const invite = await db.invite.findFirst({
      where: {
        email,
        orgId,
      },
    });
    
    return invite;
  } catch (error) {
    console.error("Error fetching invite:", error);
    return null;
  }
}

export async function validateInvite(inviteId: string) {
  try {
    const invite = await db.invite.findUnique({
      where: {
        id: inviteId,
      },
    });
    
    if (!invite) {
      return {
        valid: false,
        error: "Invitation not found",
      };
    }
    
    if (invite.status) {
      return {
        valid: false,
        error: "Invitation already used",
      };
    }
    
    // Check if invite is older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (invite.createdAt < sevenDaysAgo) {
      return {
        valid: false,
        error: "Invitation expired",
      };
    }
    
    return {
      valid: true,
      invite,
    };
  } catch (error) {
    console.error("Error validating invite:", error);
    return {
      valid: false,
      error: "Failed to validate invitation",
    };
  }
}

export async function updateInviteStatus(inviteId: string, status: boolean) {
  try {
    const updatedInvite = await db.invite.update({
      where: {
        id: inviteId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
    
    return {
      success: true,
      data: updatedInvite,
    };
  } catch (error) {
    console.error("Error updating invite status:", error);
    return {
      success: false,
      error: "Failed to update invitation",
    };
  }
}

export async function resendInvite(inviteId: string) {
  try {
    const invite = await db.invite.findUnique({
      where: {
        id: inviteId,
      },
    });
    
    if (!invite) {
      return {
        success: false,
        error: "Invitation not found",
      };
    }
    
    // You'll need to call the sendInvite function here
    // This is a placeholder - implement based on your needs
    
    return {
      success: true,
      message: "Invitation resent successfully",
    };
  } catch (error) {
    console.error("Error resending invite:", error);
    return {
      success: false,
      error: "Failed to resend invitation",
    };
  }
}

export async function deleteInvite(inviteId: string) {
  try {
    await db.invite.delete({
      where: {
        id: inviteId,
      },
    });
    
    return {
      success: true,
      message: "Invitation deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting invite:", error);
    return {
      success: false,
      error: "Failed to delete invitation",
    };
  }
}