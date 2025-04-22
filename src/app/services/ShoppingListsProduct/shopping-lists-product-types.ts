import { AuditType } from "@services/types";

export type ShoppingListProduct = {
  id: string;
  description: string;
  amount: number;
  completed: boolean;

  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };

  productDetails: {
    id: string;
    name: string;
  };

  unit: {
    id: string;
    name: string;
    shortName: string;
  };

  // image: string;
} & AuditType;

export type FirestoreShoppingListProduct = Omit<ShoppingListProduct, "id">;
export type CreateShoppingListProduct = Omit<ShoppingListProduct, "id" | "createdAt" | "updatedAt">;
export type UpdateShoppingListProduct = Partial<Omit<ShoppingListProduct, "id" | "createdAt">>;
