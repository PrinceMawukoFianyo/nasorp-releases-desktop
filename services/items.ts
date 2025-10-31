import { createItem, deleteItem, getOrgBriefItems, getOrgItems } from "@/actions/items";
import { ItemCreateProps } from "@/types/item";


// Centralized API object for all product-related server actions
export const itemAPI = {
  // Fetch all products
  getAllBrief: async (orgId: string) => {
    const res = await getOrgBriefItems(orgId);
    if (!res.success) {
      throw new Error(res.error || "Failed to fetch items");
    }
    return res.data;
  },

 
  // Create a new product
  create: async (data: ItemCreateProps) => {
    const response = await createItem(data);
    if (!response.success) {
      throw new Error(String (response.error || "Failed to create item"));
    }
    return response.data;
  },

  // Update an existing product
  /* update: async (id: string, data: UpdateProductPayload) => {
    const response = await editProduct(id, data);
    if (!response.success) {
      throw new Error(response.error || "Failed to update product");
    }
    return response.data;
  }, */

  // Delete a item
  delete: async (id: string) => {
    const response = await deleteItem(id);
    if (!response.success) {
      throw new Error(response.error || "Failed to delete item");
    }
    return true;
  },
}; 
