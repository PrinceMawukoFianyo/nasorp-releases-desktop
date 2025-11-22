import { db } from "@/prisma/db";
import { error } from "console";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, 
    { params }: { params: Promise<{ id: string }> }) {
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
        const productId = (await params).id
   
    
    // Build where clause - return all if orgId is 'all' or not provided
    const whereClause: any = {};
    
    
    // Get total count for pagination
    const totalCount = await db.item.count();
    
    // Get paginated items
    const item = await db.item.findUnique({
      where: {
        id: productId,
      },
      
    });
    
    // Return structured response
    return new Response(
      JSON.stringify({
        error: null,
        success: true,
        data: item,
      },
    ),
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