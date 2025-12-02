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

export type ApiResponse<T> = {
   data: T;
   success: boolean;
   error: string | null; 
 } 
 

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

interface BriefItemsData {

}
//export type BriefItemsResponse = ApiResponse <BriefItemData>;

export type ProductApiResponse = {
  success: boolean;
  data?: any;
  error?: string;
};
interface ProductData {
  id: string
  name: string
  sku: string
  slug: string
  barcode?: string | null
  description?: string | null
  dimensions?: string | null
  weiUSt?: string | null
  upc?: string | null
  ean?: string | null
  mpn?: string | null
  isbn?: string | null
  thumbnail: string
  imageUrl: string[]
  categoryId?: string | null
  salesCount: number
  salesTotal: number
  taxRateId?: string | null
  orgId: string
  tax: number
  brandId?: string | null
  unitId?: string | null
  unitOfMeasure?: string | null
  costPrice: number
  sellingPrice: number
  minStockLevel: number
  maxStockLevel?: number | null
  isActive: boolean
  isSerialTracked: boolean
  createdAt: string
  updatedAt: string
}

interface ProductResponse {
  success: boolean;
  data: ProductData;
  error?: string;
}

interface ProductListResponse {
  success: boolean;
  data: ProductData[];
  error?: string;
}

export type {ProductData, ProductResponse, ProductListResponse};

// export type ItemCreateProps = ApiResponse<ItemResponse>;


