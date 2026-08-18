"use server";
import { ResetPasswordEmail } from "@/components/email-templates/reset-password";
import { db } from "@/prisma/db";
import { InvitedUserProps, UserProps } from "@/types/types";
import bcrypt, { compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { PasswordProps } from "@/components/Forms/ChangePasswordForm";
import { Resend } from "resend";
import { generateToken } from "@/lib/token";
import { z } from "zod";
import { OrgData } from "@/components/Forms/RegisterForm";
import { generateOTP } from "@/lib/generateOTP";
import VerifyEmail from "@/components/email-templates/verify-email";
import { adminPermissions, userPermissions } from "@/config/permissions";
import { InviteData } from "@/components/Forms/user/UserInvitationForm";
import UserInvitation from "@/components/email-templates/user-invite";
import { generateAPIKey } from "@/lib/generateAPIKey";
import WelcomeWithPasswordEmail from "@/components/email-templates/welcome-with-password";

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

const ADMIN_USER_ROLE = {
  displayName: "Administrator",
  roleName: "admin",
  description: "Full system access",
  permissions: adminPermissions,
};

const DEFAULT_USER_ROLE = {
  displayName: "User",
  roleName: "user",
  description: "Default user role with basic permissions",
  permissions: userPermissions,
};

// ✅ FIXED: Combined and updated schema to match your User model
const UpdateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
  jobTitle: z.string().optional(),
  image: z.string().optional(),
  roleId: z.string().optional(),
  locationId: z.string().optional(),
});

type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export async function createUser(data: UserProps, orgData: OrgData) {
  const { email, password, firstName, lastName, name, phone, image } = data;

  try {
    // Use a transaction for atomic operations
    return await db.$transaction(async (tx) => {
      // Check for existing users
      const existingUserByEmail = await tx.user.findUnique({
        where: { email },
      });

      const existingUserByPhone = await tx.user.findUnique({
        where: { phone },
      });

      if (existingUserByEmail) {
        return {
          error: `This email ${email} is already in use`,
          status: 409,
          data: null,
        };
      }

      if (existingUserByPhone) {
        return {
          error: `This Phone number ${phone} is already in use`,
          status: 409,
          data: null,
        };
      }

      // Create organisation
      const existingOrganisation = await tx.organisation.findUnique({
        where: { slug: orgData.slug },
      });

      if (existingOrganisation) {
        return {
          error: `Organisation Name ${orgData.name} is already taken`,
          status: 409,
          data: null,
        };
      }

      const org = await tx.organisation.create({
        data: orgData,
      });

      // Create the Default API Key
      await tx.apiKey.create({
        data: {
          name: "Default Key",
          key: generateAPIKey(),
          orgId: org.id,
        },
      });

      // ✅ FIXED: Find or create default role for THIS organization only
      let defaultRole = await tx.role.findFirst({
        where: {
          roleName: ADMIN_USER_ROLE.roleName,
          orgId: org.id, // ✅ Search within the organization
        },
      });

      // Create default role only if it doesn't exist for THIS organization
      if (!defaultRole) {
        defaultRole = await tx.role.create({
          data: {
            ...ADMIN_USER_ROLE,
            orgId: org.id,
          },
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate a 6-digit token
      const token = generateOTP();

      // Create user with role
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          name,
          orgId: org.id,
          orgName: org.name,
          phone,
          token,
          image,
          roles: {
            connect: {
              id: defaultRole.id,
            },
          },
        },
        include: {
          roles: true,
        },
      });

      // Send the verification email
      const verificationCode = newUser.token ?? "";
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: process.env.EMAIL_FROM as string,
        to: email,
        subject: "Verify your Account",
        react: VerifyEmail({ verificationCode }),
      });

      if (emailError) {
        console.log(emailError);
        return {
          error: `Something went wrong, Please try again`,
          status: 500,
          data: null,
        };
      }

      console.log(emailData);
      return {
        error: null,
        status: 200,
        data: { id: newUser.id, email: newUser.email },
      };
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      error: `Something went wrong, Please try again`,
      status: 500,
      data: null,
    };
  }
}

export async function createInvitedUser(data: InvitedUserProps) {
  console.log("🧪 SIMPLE TEST VERSION - Data:", data);

  try {
    // ✅ FIXED: Verify that the role belongs to the same organization
    const role = await db.role.findFirst({
      where: {
        id: data.roleId,
        orgId: data.orgId,
      },
    });

    if (!role) {
      return {
        error: "Invalid role for this organization",
        status: 400,
        data: null,
      };
    }

    // Simple version without transaction
    const hashedPassword = await bcrypt.hash(data.password, 10);

    console.log("Creating user...");
    const newUser = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        name: data.name,
        orgId: data.orgId,
        orgName: data.orgName,
        phone: data.phone,
        locationId: data.locationId,
        locationName: data.locationName,
        image: data.image,
        isVerfied: true,
        roles: {
          connect: {
            id: data.roleId,
          },
        },
      },
    });

    console.log("User created:", newUser.id);

    // Update invite
    await db.invite.updateMany({
      where: {
        email: data.email,
        orgId: data.orgId,
      },
      data: {
        status: true,
      },
    });

    return {
      error: null,
      status: 200,
      data: { id: newUser.id, email: newUser.email },
    };
  } catch (error: any) {
    console.error("FULL ERROR:", error);
    return {
      error: `Database error: ${error.message}`,
      status: 500,
      data: null,
    };
  }
}

// Add this function to actions/users.ts (alongside createInvitedUser)

export async function createUserWithPassword(data: InvitedUserProps) {
  try {
    // Verify the role belongs to the organization
    const role = await db.role.findFirst({
      where: { id: data.roleId, orgId: data.orgId },
    });
    if (!role) {
      return { error: "Invalid role for this organization", status: 400, data: null };
    }

    // Prevent duplicates
    const existingUserByEmail = await db.user.findUnique({ where: { email: data.email } });
    if (existingUserByEmail) {
      return { error: `This email ${data.email} is already in use`, status: 409, data: null };
    }
    const existingUserByPhone = await db.user.findUnique({ where: { phone: data.phone } });
    if (existingUserByPhone) {
      return { error: `This phone number ${data.phone} is already in use`, status: 409, data: null };
    }

    // Use an admin-supplied password, or fall back to a default
    const plainPassword = data.password?.trim() || "Admin@2026";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        name: data.name,
        orgId: data.orgId,
        orgName: data.orgName,
        phone: data.phone,
        locationId: data.locationId,
        locationName: data.locationName,
        image: data.image,
        isVerfied: true,
        roles: { connect: { id: data.roleId } },
      },
    });

    // Email them their login details + a link to change the password
    const changePasswordUrl = `${baseUrl}/reset-password?email=${encodeURIComponent(data.email)}`;
    const { error: emailError } = await resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to: data.email,
      subject: `Your ${data.orgName} account is ready`,
      react: WelcomeWithPasswordEmail({
        orgName: data.orgName ?? "",
        email: data.email,
        password: plainPassword,
        changePasswordUrl,
      }),
    });

    if (emailError) {
      // User is already created — log it but don't fail the whole action
      console.error("Welcome email failed to send:", emailError);
    }

    revalidatePath("/dashboard/users");
    return { error: null, status: 200, data: { id: newUser.id, email: newUser.email } };
  } catch (error: any) {
    console.error("createUserWithPassword error:", error);
    return { error: `Database error: ${error.message}`, status: 500, data: null };
  }
}

export async function getAllMembers() {
  try {
    const members = await db.user.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    return members;
  } catch (error) {
    console.error("Error fetching the count:", error);
    return [];
  }
}

export async function getAllUsers() {
  try {
    const users = await db.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        roles: true,
      },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getOrgInvites(orgId: string) {
  try {
    const invites = await db.invite.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        orgId,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        status: true,
      },
    });
    return invites;
  } catch (error) {
    console.error("Error fetching invites:", error);
    return [];
  }
}

export async function getOrgUsers(orgId: string) {
  try {
    const users = await db.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        orgId,
      },
      include: {
        roles: true,
      },
    });
    return users;
  } catch (error) {
    console.error("Error fetching org users:", error);
    return [];
  }
}

export async function deleteUser(id: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        id,
      },
      select: {
        email: true,
      },
    });

    if (user?.email) {
      await db.invite.deleteMany({
        where: {
          email: user.email,
        },
      });
    }

    const deleted = await db.user.delete({
      where: {
        id,
      },
    });

    revalidatePath("/dashboard/settings/users");
    return {
      ok: true,
      data: deleted,
    };
  } catch (error) {
    console.log(error);
    return {
      ok: false,
      error: "Failed to delete user",
    };
  }
}

// ✅ FIXED: Single getUserById function with proper includes
export async function getUserById(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: true,
        Location: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function sendResetLink(email: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      return {
        status: 404,
        error: "We cannot associate this email with any user",
        data: null,
      };
    }
    const token = generateToken();
    const update = await db.user.update({
      where: {
        email,
      },
      data: {
        token,
      },
    });
    const userFirstname = user.firstName;

    const resetPasswordLink = `${baseUrl}/reset-password?token=${token}&&email=${email}`;
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to: email,
      subject: "Reset Password Request",
      react: ResetPasswordEmail({ userFirstname, resetPasswordLink }),
    });
    if (error) {
      return {
        status: 404,
        error: error.message,
        data: null,
      };
    }
    console.log(data);
    return {
      status: 200,
      error: null,
      data: data,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      error: "We cannot find your email",
      data: null,
    };
  }
}

export async function updateUserPassword(id: string, data: PasswordProps) {
  const existingUser = await db.user.findUnique({
    where: {
      id,
    },
  });
  // Check if the Old Passw = User Pass
  let passwordMatch: boolean = false;
  //Check if Password is correct
  if (existingUser && existingUser.password) {
    // if user exists and password exists
    passwordMatch = await compare(data.oldPassword, existingUser.password);
  }
  if (!passwordMatch) {
    return { error: "Old Password Incorrect", status: 403 };
  }
  const hashedPassword = await bcrypt.hash(data.newPassword, 10);
  try {
    const updatedUser = await db.user.update({
      where: {
        id,
      },
      data: {
        password: hashedPassword,
      },
    });
    revalidatePath("/dashboard/clients");
    return { error: null, status: 200 };
  } catch (error) {
    console.log(error);
    return { error: "Failed to update password", status: 500 };
  }
}

export async function resetUserPassword(
  email: string,
  token: string,
  newPassword: string
) {
  const user = await db.user.findUnique({
    where: {
      email,
      token,
    },
  });
  if (!user) {
    return {
      status: 404,
      error: "Please use a valid reset link",
      data: null,
    };
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  try {
    const updatedUser = await db.user.update({
      where: {
        email,
        token,
      },
      data: {
        password: hashedPassword,
      },
    });
    return {
      status: 200,
      error: null,
      data: null,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      error: "Failed to reset password",
      data: null,
    };
  }
}

// ✅ FIXED: Single unified updateUser function that handles all update scenarios
export async function updateUser(
  userId: string,
  data: UpdateUserInput & { orgId?: string }
) {
  try {
    // Validate input data
    const validatedData = UpdateUserSchema.parse(data);

    // Get the existing user
    const existingUser = await db.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      return {
        success: false,
        error: "User not found",
        data: null,
      };
    }

    // If orgId is provided, verify user belongs to that org
    if (data.orgId && existingUser.orgId !== data.orgId) {
      return {
        success: false,
        error: "User not found or access denied",
        data: null,
      };
    }

    // Check if email is being changed and if it's already taken
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await db.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: {
            id: userId,
          },
        },
      });

      if (emailExists) {
        return {
          success: false,
          error: "Email is already in use",
          data: null,
        };
      }
    }

    // Check if phone is being changed and if it's already taken
    if (validatedData.phone && validatedData.phone !== existingUser.phone) {
      const phoneExists = await db.user.findFirst({
        where: {
          phone: validatedData.phone,
          NOT: {
            id: userId,
          },
        },
      });

      if (phoneExists) {
        return {
          success: false,
          error: "Phone number is already in use",
          data: null,
        };
      }
    }

    // ── Prepare update data ──
    // const updateData: any = {
    //   email: validatedData.email,
    //   phone: validatedData.phone || null,
    //   image: validatedData.image || null,
    //   jobTitle: validatedData.jobTitle || null,
    // };
    const updateData: any = {
      email: validatedData.email,
    };

    // FIX: only set these if they were actually provided — sending `null` for
    // `phone` blows up because it's a required (non-nullable) field in your
    // Prisma schema. `image` and `jobTitle` are presumably nullable so they're
    // fine, but doing it this way for all three is safer either way.
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone;
    }
    if (validatedData.image !== undefined) {
      updateData.image = validatedData.image || null;
    }
    if (validatedData.jobTitle !== undefined) {
      updateData.jobTitle = validatedData.jobTitle || null;
    }

    // Handle name fields
    if (validatedData.firstName && validatedData.lastName) {
      updateData.firstName = validatedData.firstName;
      updateData.lastName = validatedData.lastName;
      updateData.name = `${validatedData.firstName} ${validatedData.lastName}`;
    } else if (validatedData.name) {
      updateData.name = validatedData.name;
      // Try to split name into first and last
      const nameParts = validatedData.name.split(" ");
      if (nameParts.length >= 2) {
        updateData.firstName = nameParts[0];
        updateData.lastName = nameParts.slice(1).join(" ");
      }
    }

    // ── FIX: update role relation correctly ──
    if (validatedData.roleId) {
      updateData.roles = {
        set: [{ id: validatedData.roleId }],
      };
    }
    // Location is a direct relation (foreign key)
    if (validatedData.locationId) {
      updateData.locationId = validatedData.locationId;
    }

    // ── Update the user ──
    const updatedUser = await db.user.update({
      where: {
        id: userId,
      },
      data: updateData,
      include: {
        roles: true,
        Location: true,
      },
    });

    // Revalidate relevant pages
    revalidatePath("/dashboard/settings/users");
    revalidatePath("/dashboard/settings/profile");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: updatedUser,
      error: null,
    };
  } catch (error) {
    console.error("Error updating user:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid data provided",
        data: null,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return {
      success: false,
      error: "Failed to update user",
      data: null,
    };
  }
}

export async function verifyOTP(userId: string, otp: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (user?.token !== otp) {
      return {
        status: 403,
      };
    }
    return {
      status: 200,
    };
  } catch (error) {
    return {
      status: 403,
    };
  }
}

export async function getCurrentUsersCount() {
  try {
    const count = await db.user.count();
    return count;
  } catch (error) {
    console.log(error);
    return 0;
  }
}

export async function sendInvite(data: InviteData) {
  const { email, orgId, orgName, roleId, roleName, locationId, locationName } =
    data;

  try {
    // ✅ FIXED: Verify that the role belongs to the same organization
    const role = await db.role.findFirst({
      where: {
        id: roleId,
        orgId: orgId,
      },
    });

    if (!role) {
      return {
        error: "Invalid role for this organization",
        status: 400,
        data: null,
      };
    }

    // Check for existing users
    const existingUserByEmail = await db.user.findFirst({
      where: { email, orgId },
    });
    if (existingUserByEmail) {
      return {
        error: `This email ${email} is already in use`,
        status: 409,
        data: null,
      };
    }
    // Check if already invited
    const existingInvite = await db.invite.findFirst({
      where: { email, orgId }, // ✅ FIXED: Check invite within the organization
    });
    if (existingInvite) {
      return {
        error: `This User ${email} is already invited`,
        status: 409,
        data: null,
      };
    }
    //Create The Invite
    await db.invite.create({
      data: {
        email,
        orgId,
      },
    });
    // Send the Verification email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const linkUrl = `${baseUrl}/user-invite/${orgId}?roleId=${roleId}&email=${email}&orgName=${orgName}&locationId=${locationId}&locationName=${locationName}`;
    console.log("📧 Invitation link generated:", linkUrl);
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to: email,
      subject: `Welcome to ${orgName} - ${roleName} Role Invitation `,
      react: UserInvitation({ orgName, roleName, linkUrl }),
    });
    if (error) {
      console.log(error);
      return {
        error: `Something went wrong, Please try again`,
        status: 500,
        data: null,
      };
    }
    console.log(emailData);
    revalidatePath("/dashboard/users");
    return {
      error: null,
      status: 200,
      data: emailData,
    };
  } catch (error) {
    console.log(error);
    return {
      error: "Failed to send invitation",
      status: 500,
      data: null,
    };
  }
}