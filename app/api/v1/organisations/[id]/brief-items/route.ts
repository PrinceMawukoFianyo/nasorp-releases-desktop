import { db } from "@/prisma/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const orgId = (await params).id;
    
    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build where clause - return all if orgId is 'all' or not provided
    const whereClause: any = {};
    
    if (orgId && orgId !== 'all') {
      whereClause.orgId = orgId;
    }
    
    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        // Add other searchable fields as needed
      ];
    }
    
    // Get total count for pagination
    const totalCount = await db.item.count({
      where: whereClause,
    });
    
    // Get paginated items
    const items = await db.item.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sellingPrice: true,
        costPrice: true,
        salesTotal: true,
        salesCount: true,
        thumbnail: true,
        createdAt: true,
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
        meta: {
          organizationId: orgId !== 'all' ? orgId : null,
          filter: search || null,
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
  // Parse the request body
  const body = await request.json();
  const { name } = body;
 
  // e.g. Insert new user into your DB
  const newUser = { id: Date.now(), name };
 
  return new Response(JSON.stringify(newUser), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
} 

