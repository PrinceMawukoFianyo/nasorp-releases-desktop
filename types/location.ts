import { LocationType } from "@prisma/client";

export type LocationCreateProps = {
  
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string ;     
}

// types/item.ts
export interface LocationResponse {
  id: string;
  name: string;
  type: LocationType;
  address: string | null;
  phone: string | null;
  email: string | null;  
  createdAt: Date;

}

// Pagination Info
export interface Pagination {
  total: number;
  page: number;
  limit: number,
  pages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | null;
}







