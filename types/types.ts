import { Role, User } from "@prisma/client";


export type  CategoryProps = {
  title: string;
  slug: string;
  imageUrl: string;
  description: string;

};
export type SavingProps = {
  amount: number;
  month: string;
  name: string;
  userId: string;
  paymentDate: any;
};
export type InvitedUserProps = {
  name: string;
  orgId: string;
  orgName: string;
  locationName: string;
  locationId: string;
  roleId: string;
  firstName: string;
  lastName: string;
  phone: string;
  image: string;
  email: string;
  password: string;
};
export type UserProps = {
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  image: string;
  email: string;
  password: string;
};
export type LoginProps = {
  email: string;
  password: string;
};
export type ForgotPasswordProps = {
  email: string;
};

// types/types.ts

export interface RoleFormData {
  displayName: string;
  description?: string;
  permissions: string[];
  orgId: string;
}

export interface UserWithRoles extends User {
  roles: Role[];
}

export interface RoleOption {
  label: string;
  value: string;
}

export interface UpdateUserRoleResponse {
  error: string | null;
  status: number;
  data: UserWithRoles | null;
}

export interface RoleResponse {
  id: string;
  displayName: string;
  description?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitResponse {
  id: string;
  name: string;
  symbol: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface TaxResponse {
  id: string;
  name: string;
  rate: number;
  createdAt: Date;
  updatedAt: Date;
}



export interface BrandResponse {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryResponse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  orgId?: string;
  createdAt: Date;
  updatedAt: Date;
};


export type SupplierCreateProps = {
  
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
      
}

// types/item.ts
export interface SupplierResponse {
  id:           string;       
  name:         string;
  contactPerson: string | null;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
  taxId:        string | null;
  paymentTerms: number;
  notes:        string | null;
  isActive:     boolean; 
  createdAt: Date;
  updatedAt: Date;

}

export type BriefSupplierResponse = {
  id: string,
  name: string,
  contactPerson: string | null,
  phone: string | null,
  email: string | null,   
  createdAt: Date,
}
