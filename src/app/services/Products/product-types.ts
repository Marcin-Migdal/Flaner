import { Timestamp } from "firebase/firestore";

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  // image: string;
  ownerId: string;
  editAccess: string[];
  viewAccess: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type FirestoreProduct = Omit<Product, "id">;
export type CreateProduct = Omit<Product, "id" | "createdAt" | "updatedAt">;
export type UpdateProduct = Partial<Omit<Product, "id" | "ownerId" | "createdAt">>;
