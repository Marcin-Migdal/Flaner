import { AccessType, AuditType } from "../types";

export type ShoppingList = {
  id: string;
  name: string;
} & AccessType &
  AuditType;

export type FirestoreShoppingList = Omit<ShoppingList, "id">;
export type CreateShoppingList = Omit<ShoppingList, "id" | "createdAt" | "updatedAt">;
export type UpdateShoppingList = { currentUserId: string } & Pick<ShoppingList, "name"> &
  Partial<Omit<ShoppingList, "id" | "ownerId" | "name" | "createdAt">>;
