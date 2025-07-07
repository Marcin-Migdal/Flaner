import { AuditType } from "../types";

export type ShoppingListProductCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type ShoppingListProductDetails = {
  id: string;
  name: string;
};

export type ShoppingListProductUnit = {
  id: string;
  name: string;
  shortName: string;
};

export type ShoppingListProduct = {
  id: string;
  description: string;
  amount: number;
  completed: boolean;

  category: ShoppingListProductCategory;
  productDetails: ShoppingListProductDetails;
  unit: ShoppingListProductUnit;

  // image: string;
} & AuditType;

export type FirestoreShoppingListProduct = Omit<ShoppingListProduct, "id">;
export type CreateShoppingListProduct = Omit<ShoppingListProduct, "id" | "createdAt" | "updatedAt">;
export type UpdateShoppingListProduct = Partial<Omit<ShoppingListProduct, "id" | "createdAt">>;
