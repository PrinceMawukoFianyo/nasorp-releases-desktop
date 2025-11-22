import { generateSlug } from "@/lib/generateSlug";
import { db } from "@/prisma/db";
import { ItemCreateProps} from "@/types/item";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    
    const headersList = await headers();
        const apiKey = headersList.get("x-api-key");
    
        if (!apiKey) {
           return new Response(
          JSON.stringify({
            success: false,
            error: "API Key is required",
            data: null,
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
        }
    
        const validKey = await db.apiKey.findUnique({ where: { key: apiKey } });
        if (!validKey) {
           return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid API Key",
            data: null,
           
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
        }
    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build where clause - return all if orgId is 'all' or not provided
    const whereClause: any = {};
    
    
    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        // Add other searchable fields as needed
      ];
    }
    
    // Get total count for pagination
    const totalCount = await db.item.count();
    
    // Get paginated items
    const items = await db.item.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });
    
    // Calculate pagination details
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Return structured response
    return new Response(
      JSON.stringify({
        success: true,
        data: items,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching items:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch items",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
 
export async function POST(request: Request) {
  try {
    // Parse the request body
    const data: ItemCreateProps = await request.json();
    const slug = generateSlug(data.name);
   
    const existingItem = await db.item.findUnique({
        where: {
          slug,
        }
      });
      if (existingItem) {
        return new Response(JSON.stringify({
          success: false,
          status: 409,
          data: null,
          error: "Item Already Exist"
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
   
    // Create new item
    data.slug = slug;
    const newItem = await db.item.create({
      data: data
    });
   
    return new Response(JSON.stringify({
      success: true, 
      status: 201,
      data: newItem,
      message: "Item created successfully"
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      status: 500,
      data: null,
      error: "Failed to create item"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}