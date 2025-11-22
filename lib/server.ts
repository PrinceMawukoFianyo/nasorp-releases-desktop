// lib/api/server.ts
"use server";

import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/config/auth";
import { getOrgKey } from "@/actions/apiKeys";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function createServerApi() {
  const session = await getServerSession(authOptions);
  const apiKey = await getOrgKey(session?.user?.orgId ?? "");

  return axios.create({
    baseURL: `${BASE_URL}/api/v1`,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey ?? "",
    },
  });
}

// Helper functions for common operations
export async function serverGet<T>(url: string): Promise<T> {
  const api = await createServerApi();
  const response = await api.get<T>(url);
  return response.data;
}

export async function serverPost<T>(url: string, data: any): Promise<T> {
  const api = await createServerApi();
  const response = await api.post<T>(url, data);
  return response.data;
}