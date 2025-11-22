"use server"
import axios from "axios";
import { getAuthenticatedUser } from "./useAuth";
import { getOrgKey } from "@/actions/apiKeys";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL; 

// Create a Base axios instance without authentication
const baseApi = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  }
})

// ✅ FIXED: No more TypeScript errors
export async function getAuthenticatedApi() {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      throw new Error("Not authenticated. Please login.");
    }

    const orgId = session?.user.orgId ?? "";
    
    if (!orgId) {
      throw new Error("Organization ID not found in session.");
    }

    // ✅ Try to get API key from database
    let apiKey: string = ""; // Changed to string, not null
    
    try {
      const dbKey = await getOrgKey(orgId);
      apiKey = dbKey || ""; // Convert null/undefined to empty string
    } catch (dbError) {
      console.error("❌ Failed to fetch API key from database:", dbError);
    }

    // ✅ If no API key from DB, use environment variable
    if (!apiKey) {
      console.warn("⚠️ No API key from database, using environment variable");
      apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";
    }

    // ✅ Final check - throw error if still no key
    if (!apiKey) {
      throw new Error("API Key not found. Please add API_KEY to your .env file.");
    }

    console.log("✅ API Key found:", apiKey.substring(0, 10) + "...");

    // Return a new instance with the API Key  
    const authenticatedApi = axios.create({
      baseURL: `${BASE_URL}/api/v1`,
      timeout: 10000, // 10 seconds
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey, // Now guaranteed to be a string
      },
    });

    return authenticatedApi;
  } catch (error) {
    console.error("❌ getAuthenticatedApi failed:", error);
    throw error;
  }
}

export { baseApi as api };
 
// Example of how to use the authenticated API in a server action
export async function fetchProtectedData(endpoint: string, params = {}) {
  try {
    const api = await getAuthenticatedApi();
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error("API request failed", error);
    throw error;
  }
}