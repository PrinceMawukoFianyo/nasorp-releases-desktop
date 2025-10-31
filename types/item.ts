export type ItemCreateProps = {
  
  name: string;
  slug: string;
  orgId: string; 
  sku: string;
  costPrice: number;
  sellingPrice: number;
  thumbnail?: string;
  isbn: string;      
  tax: number;       
}

// types/item.ts
export interface BriefItemResponse {
  id: string;
  name: string;
  slug: string;
  sellingPrice: number;
  costPrice: number;
  salesCount: number;      
  salesTotal: number;
  thumbnail: string | null;
  createdAt: Date;
}

// Pagination Info
export interface Pagination {
  total: number;
  page: number;
  limit: number,
  pages: number;
}

//Complete response structure
export interface BriefItemDTO {
  data: BriefItemResponse[];
  pagination: Pagination;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// export type ApiResponse<T> = {
//   data: T;
//   success: boolean;
//   error: string | null; 
// } 
 

export type ProductPayload = {
  name: string;
  price: string;
  numberPlate: string;
};

//type BriefItemDTO = PaginatedResponse<BriefItem>;

export type UpdateProductPayload = {
  name?: string;
  price?: string;
  numberPlate?: string;
};

export type ProductApiResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

// export type ItemCreateProps = ApiResponse<ItemResponse>;