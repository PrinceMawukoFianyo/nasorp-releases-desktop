// app/api/uploadthing/core.ts
import { createUploadthing } from "uploadthing/next";
import type { FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/config/auth";

const f = createUploadthing();

// Helper to get auth context
const auth = (req: Request) => getServerSession(authOptions);

// FileRouter for production with VALID file sizes
export const ourFileRouter = {
  // PROFILE IMAGES - For user avatars
  profileImage: f({
    image: { 
      maxFileSize: "4MB", // Valid: 4MB is allowed
      maxFileCount: 1 
    }
  })
  .middleware(async ({ req }) => {
    // Authentication for production
    const session = await auth(req);
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    
    return { 
      userId: session.user.id,
      userEmail: session.user.email 
    };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    console.log("PRODUCTION - Profile image uploaded:", {
      userId: metadata.userId,
      fileUrl: file.url,
      fileName: file.name,
      fileSize: file.size,
      timestamp: new Date().toISOString(),
    });
    
    return { 
      uploadedBy: metadata.userId,
      fileUrl: file.url 
    };
  }),

  // CATEGORY IMAGES
  categoryImage: f({ 
    image: { 
      maxFileSize: "4MB", // Increased from 1MB
      maxFileCount: 1 
    } 
  })
  .middleware(async ({ req }) => {
    const session = await auth(req);
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    
    return { userId: session.user.id };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    console.log("Category image uploaded by:", metadata.userId);
    return { 
      uploadedBy: metadata.userId,
      fileUrl: file.url 
    };
  }),

  // ITEM IMAGES (Single)
  itemImage: f({ 
    image: { 
      maxFileSize: "4MB", // Valid: 4MB is allowed
      maxFileCount: 1 
    } 
  })
  .middleware(async ({ req }) => {
    const session = await auth(req);
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    
    return { userId: session.user.id };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return { 
      uploadedBy: metadata.userId,
      fileUrl: file.url 
    };
  }),

  // ITEM IMAGES (Multiple)
  itemImages: f({ 
    image: { 
      maxFileSize: "4MB", // Valid: 4MB is allowed
      maxFileCount: 10  // Increased from 4
    } 
  })
  .middleware(async ({ req }) => {
    const session = await auth(req);
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    
    return { userId: session.user.id };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return { 
      uploadedBy: metadata.userId,
      fileUrl: file.url 
    };
  }),

  // BLOG IMAGES
  blogImage: f({ 
    image: { 
      maxFileSize: "4MB", // Valid: 4MB is allowed
      maxFileCount: 1 
    } 
  })
  .middleware(async ({ req }) => {
    const session = await auth(req);
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    
    return { userId: session.user.id };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return { 
      uploadedBy: metadata.userId,
      fileUrl: file.url 
    };
  }),

  // GENERAL FILE UPLOADS - Use valid size values
  fileUploads: f({
    // Images: Use 4MB (max allowed for free tier)
    image: { maxFileSize: "4MB", maxFileCount: 10 },
    
    // Documents: Use 4MB (instead of 10MB)
    pdf: { maxFileSize: "4MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "4MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "4MB",
      maxFileCount: 5,
    },
    "application/vnd.ms-excel": { maxFileSize: "4MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "4MB",
      maxFileCount: 5,
    },
    "application/vnd.ms-powerpoint": { maxFileSize: "4MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
      maxFileSize: "4MB",
      maxFileCount: 5,
    },
    
    // Text files: Use 4MB (instead of 5MB)
    "text/plain": { maxFileSize: "4MB", maxFileCount: 5 },
    
    // Archives: Use 16MB (valid value, instead of 20MB)
    "application/gzip": { maxFileSize: "16MB", maxFileCount: 3 },
    "application/zip": { maxFileSize: "16MB", maxFileCount: 3 },
  })
  .middleware(async ({ req }) => {
    const session = await auth(req);
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    
    return { userId: session.user.id };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    console.log("File uploaded:", {
      type: file.type,
      name: file.name,
      size: file.size,
      uploadedBy: metadata.userId
    });
    
    return { 
      uploadedBy: metadata.userId,
      fileUrl: file.url 
    };
  }),

  // LARGE FILE UPLOADS (if you need larger than 4MB, use 16MB or 32MB)
  largeUploads: f({
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    pdf: { maxFileSize: "16MB", maxFileCount: 3 },
    video: { maxFileSize: "64MB", maxFileCount: 1 }, // If you add video support
  })
  .middleware(async ({ req }) => {
    const session = await auth(req);
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    
    return { userId: session.user.id };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return { 
      uploadedBy: metadata.userId,
      fileUrl: file.url,
      fileSize: file.size 
    };
  }),

  // PUBLIC UPLOADS (No auth required - use with caution)
  publicUploads: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 }
  })
  .onUploadComplete(async ({ file }) => {
    console.log("Public upload:", file.url);
    return { fileUrl: file.url };
  }),

} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;