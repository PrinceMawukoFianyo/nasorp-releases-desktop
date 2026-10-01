"use server";

import { api, getAuthenticatedApi } from "@/config/axios";
import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";
import { BriefItemDTO, ItemCreateProps, ProductResponse, ProductData} from "@/types/item";
import { LocationCreateProps, LocationResponse } from "@/types/location";
import { LocationType } from "@/generated/prisma-client";
import axios from "axios";
import { truncate, truncateSync } from "fs";
import { revalidatePath } from "next/cache";


interface ApiResponse {
  data: ProductData | null
  success: boolean
  error?: string
}

export async function createLocation(data: LocationCreateProps) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    
    // FIX 1: Convert String to string for Prisma compatibility
    const location = await db.location.create({
      data: {
        name: data.name,
        type: data.type as LocationType,
        address: data.address ? String(data.address) : undefined,
        phone: data.phone ? String(data.phone) : undefined,
        email: data.email ? String(data.email) : undefined,
        orgId,
      },
    });
    return {
      success: true,
      data: location,
      error: 200,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Failed to Create a Location",
      data: null,    
    };
  }
}

export async function getOrgLocations() {
  try {
    // FIX 2: Added missing user declaration
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    
    // FIX 3: Changed variable name from 'res' to 'locations'
    const locations = await db.location.findMany({
      where: {
        orgId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
         id: true,
        name: true,
        type: true,
        address: true,
        phone: true,
        email: true,  
        createdAt: true,
      },
    });
    return locations;
  } catch (error) {
    console.log(error);
    return [];
  }
}


export async function getLocationById(
  id: string,
){
  try {
    const location = await db.location.findUniqueOrThrow({
      where:{
        id
      }
    })
    return location;
  } catch (error) {
    console.error("Error fetching items:", error);
  
    throw new Error("An unexpected error occurred"); 
  }
} 

// Add this to your actions/locations.ts file

export async function updateLocationById(id: string, data: Partial<LocationResponse>) {
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

    const updatedLocation = await db.location.update({
      where: { id },
      data: sanitizedData,
    });
  
    console.log("✅ Update location successful:", id, sanitizedData);
    revalidatePath(`/dashboard/settings/locations`);
    revalidatePath(`/dashboard/settings/locations/${id}`);
    
    return { 
      success: true,
      data: updatedLocation 
    };
  } catch (error) {
    console.error("❌ Update location failed:", error);
    
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
export async function deleteLocation(id: string) {
  try {
    const location = await db.location.findUnique({
      where: {
        id
      }
    })
    if(!location){
      return {
      success: false,
      data: null,
      error: "No location Found",
    };  
    }
  
    const deleted = await db.location.delete({
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
      error: "Location failed to delete",
    };
  }
}

export async function getLocationsWithItemCounts(orgId: string) {
  try {
    // Get all active locations with their inventory counts
    const locations = await db.location.findMany({
      where: { 
        orgId,
        isActive: true 
      },
      include: {
        inventories: {
          where: {
            quantity: { gt: 0 } // Only count locations with stock
          },
          select: {
            itemId: true,
            quantity: true
          }
        },
        _count: {
          select: {
            inventories: {
              where: {
                quantity: { gt: 0 }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get total active items count
    const totalItems = await db.item.count({
      where: {
        orgId,
        isActive: true
      }
    });

    // Transform to our format
    const locationsWithCounts = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      type: loc.type,
      itemCount: loc._count.inventories,
      // Optional: get total quantity if needed
      totalQuantity: loc.inventories.reduce((sum, inv) => sum + inv.quantity, 0)
    }));

    return {
      success: true,
      data: locationsWithCounts,
      totalItems
    };
  } catch (error) {
    console.error("Error fetching locations with counts:", error);
    return {
      success: false,
      error: "Failed to fetch locations",
      data: [],
      totalItems: 0
    };
  }
}

