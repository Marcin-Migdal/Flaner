import { AccessType, AuditType } from "../types";

export type ProductCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
} & AccessType &
  AuditType;

export type FirestoreProductCategory = Omit<ProductCategory, "id">;
export type CreateProductCategory = Omit<ProductCategory, "id" | "createdAt" | "updatedAt">;
export type UpdateProductCategory = Partial<Omit<ProductCategory, "id" | "ownerId" | "createdAt">>;
