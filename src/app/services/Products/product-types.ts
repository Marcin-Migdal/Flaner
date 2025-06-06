import { AccessType, AuditType } from "../types";

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  // image: string;
} & AccessType &
  AuditType;

export type FirestoreProduct = Omit<Product, "id">;
export type CreateProduct = Omit<Product, "id" | "createdAt" | "updatedAt">;
export type UpdateProduct = { currentUserId: string } & Pick<Product, "name"> &
  Partial<Omit<Product, "id" | "name" | "ownerId" | "createdAt">>;
