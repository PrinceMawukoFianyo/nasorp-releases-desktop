"use server";

import { api, getAuthenticatedApi } from "@/config/axios";
import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";
import { BriefItemDTO, ItemCreateProps, ProductResponse, ProductData} from "@/types/item";
import { LocationCreateProps, LocationResponse } from "@/types/location";
import { SupplierCreateProps, SupplierResponse } from "@/types/types";
import { LocationType } from "@prisma/client";
import axios from "axios";
import { truncate, truncateSync } from "fs";
import { revalidatePath } from "next/cache";


interface ApiResponse {
  data: ProductData | null
  success: boolean
  error?: string
}

export async function createSupplier(data: SupplierCreateProps) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    
    // FIX 1: Convert String to string for Prisma compatibility
    const supplier = await db.supplier.create({
      data: {
        ...data,
        orgId
      },
    });
    return {
      success: true,
      data: supplier,
      error: 200,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Failed to Create a Supplier",
      data: null,    
    };
  }
}

export async function getOrgSupplier() {
  try {
    // FIX 2: Added missing user declaration
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    
    // FIX 3: Changed variable name from 'res' to 'locations'
    const supplier = await db.supplier.findMany({
      where: {
        orgId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
         id: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: true,   
        createdAt: true,
      },
    });
    return supplier;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getBriefSuppliers() {
  try {
    // FIX 2: Added missing user declaration
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    
    // FIX 3: Changed variable name from 'res' to 'locations'
    const suppliers = await db.supplier.findMany({
      where: {
        orgId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
         id: true,
        name: true,
      },
    });
    return suppliers;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getSupplierById(
  id: string,
){
  try {
    const supplier = await db.supplier.findUniqueOrThrow({
      where:{
        id
      }
    })
    return supplier;  
  } catch (error) {
    console.error("Error fetching suppliers:", error);
  
    throw new Error("An unexpected error occurred"); 
  }
} 

// Add this to your actions/locations.ts file

export async function updateSupplierById(id: string, data: Partial<SupplierResponse>) {
  try {
    // Transform null values to undefined for Prisma
    const prismaData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = value === null ? undefined : value;
      return acc;
    }, {} as Record<string, any>);

    // ✅ VALIDATION: Only allow fields that exist in Location schema
    const validFields = [
      'name',
      'type',
      'address',
      'phone',
      'email',
      'isActive',
      'orgId'
    ];

    const sanitizedData = Object.entries(prismaData).reduce((acc, [key, value]) => {
      if (validFields.includes(key)) {
        acc[key] = value;
      } else {
        console.warn(`⚠️ Skipping invalid field: ${key}`);
      }
      return acc;
    }, {} as Record<string, any>);

    // Ensure type is properly cast if provided
    if (sanitizedData.type && typeof sanitizedData.type === 'string') {
      // Type is already a string matching LocationType enum
      // Prisma will validate it matches the enum
    }

    const updatedSupplier = await db.supplier.update({
      where: { id },
      data: sanitizedData,
    });
  
    console.log("✅ Update supplier successful:", id, sanitizedData);
    revalidatePath(`/dashboard/purchases/suppliers`);
    revalidatePath(`/dashboard/purchases/suppliers/${id}`);
    
    return { 
      success: true,
      data: updatedSupplier 
    };
  } catch (error) {
    console.error("❌ Update supplier failed:", error);
    
    // Return more detailed error information
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: "An unknown error occurred"
    };
  }
}

// Also add a deleteLocation function if missing
export async function deleteSupplier(id: string) {
  try {
    const supplier = await db.supplier.findUnique({
      where: {
        id
      }
    })
    if(!supplier){
      return {
      success: false,
      data: null,
      error: "No supplier Found",
    };  
    }
  
    const deleted = await db.supplier.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      data: deleted,
      error: null,
    };
  } catch (error) {
    console.log(error);
    return{
      success: false,
      data: null,
      error: "Supplier failed to delete",
    };
  }
}

