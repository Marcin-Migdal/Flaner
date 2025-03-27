import { Timestamp } from "firebase/firestore";

export type ProductCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  ownerId: string;
  editAccess: string[];
  viewAccess: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type FirestoreProductCategory = Omit<ProductCategory, "id">;
export type CreateProductCategory = Omit<ProductCategory, "id" | "createdAt" | "updatedAt">;
export type UpdateProductCategory = Partial<Omit<ProductCategory, "id" | "ownerId" | "createdAt">>;
