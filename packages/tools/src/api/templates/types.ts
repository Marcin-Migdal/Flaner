import type { Timestamp } from "firebase/firestore";

export type FilamentTemplate = {
  id: string;
  userId: string;
  material: string;
  type: string;
  colorName: string;
  colorHex: string;
  defaultWeight: number;
  createdAt?: Timestamp | null;
};

export type TemplateInput = Omit<FilamentTemplate, "id" | "userId" | "createdAt">;
