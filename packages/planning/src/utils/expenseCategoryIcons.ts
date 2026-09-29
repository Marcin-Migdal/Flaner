import { Car, Home, type LucideIcon, Receipt, ShoppingBag, Ticket, UtensilsCrossed } from "lucide-react";
import type { ExpenseCategory } from "../api/splits/types";

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  food: UtensilsCrossed,
  transport: Car,
  housing: Home,
  entertainment: Ticket,
  shopping: ShoppingBag,
  general: Receipt,
};
