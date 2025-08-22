"use server";
import { ResetPasswordEmail } from "@/components/email-templates/reset-password";
import { db } from "@/prisma/db";
import { UserProps } from "@/types/types";
import bcrypt, { compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { PasswordProps } from "@/components/Forms/ChangePasswordForm";
import { Resend } from "resend";
import { generateToken } from "@/lib/token";
import { z } from "zod";
// import { generateNumericToken } from "@/lib/token";
const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

const DEFAULT_USER_ROLE = {
  displayName: "User",
  roleName: "user",
  description: "Default user role with basic permissions",
  permissions: [
    "dashboard.read",
    "profile.read",
    "profile.update",
    "orders.read",
  ],
};
const UpdateUserSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  jobTitle: z.string().optional(),
  image: z.string().optional(),
});
type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export async function createUser(data: UserProps) {
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

      // Find or create default role
      let defaultRole = await tx.role.findFirst({
        where: { roleName: DEFAULT_USER_ROLE.roleName },
      });

      // Create default role if it doesn't exist
      if (!defaultRole) {
        defaultRole = await tx.role.create({
          data: DEFAULT_USER_ROLE,
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with role
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          name,
          phone,
          image,
          roles: {
            connect: {
              id: defaultRole.id,
            },
          },
        },
        include: {
          roles: true, // Include roles in the response
        },
      });

      return {
        error: null,
        status: 200,
        data: newUser,
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
    return 0;
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
    console.error("Error fetching the count:", error);
    return 0;
  }
}

export async function deleteUser(id: string) {
  try {
    const deleted = await db.user.delete({
      where: {
        id,
      },
    });

    return {
      ok: true,
      data: deleted,
    };
  } catch (error) {
    console.log(error);
  }
}

export async function getUserById(id: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        id,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
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
      from: "NextAdmin <info@desishub.com>",
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
  }
}

export async function updateUser(userId: string, data: UpdateUserInput) {
  try {
    // Validate input data
    const validatedData = UpdateUserSchema.parse(data);

    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingUser = await db.user.findFirst({
        where: {
          email: data.email,
          NOT: {
            id: userId,
          },
        },
      });

      if (existingUser) {
        return {
          error: "Email already in use",
        };
      }
    }

    // Check if phone is being changed and if it's already taken
    if (data.phone) {
      const existingUser = await db.user.findFirst({
        where: {
          phone: data.phone,
          NOT: {
            id: userId,
          },
        },
      });

      if (existingUser) {
        return {
          error: "Phone number already in use",
        };
      }
    }

    // Update user
    const updatedUser = await db.user.update({
      where: {
        id: userId,
      },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        jobTitle: validatedData.jobTitle,
        name: `${validatedData.firstName} ${validatedData.lastName}`, // Update full name
        image: validatedData.image,
      },
    });
    // Revalidate user data
    revalidatePath("/dashboard/settings/profile");
    revalidatePath("/dashboard");
    return {
      data: updatedUser,
      error: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: "Invalid data provided",
      };
    }

    if (error instanceof Error) {
      return {
        error: error.message,
      };
    }
    return {
      error: "Something went wrong",
    };
  }
}
