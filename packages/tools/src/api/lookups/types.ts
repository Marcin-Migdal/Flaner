import type { Timestamp } from "firebase/firestore";

export type LookupMaterial = {
  id: string;
  userId: string;
  name: string;
  createdAt?: Timestamp;
};

export type LookupType = {
  id: string;
  userId: string;
  materialName: string;
  name: string;
  createdAt?: Timestamp;
};

export type LookupColor = {
  id: string;
  userId: string;
  materialName: string;
  typeName: string;
  name: string;
  hex: string;
  createdAt?: Timestamp;
};

export type AddLookupMaterialInput = {
  name: string;
};

export type AddLookupTypeInput = {
  materialName: string;
  name: string;
};

export type AddLookupColorInput = {
  materialName: string;
  typeName: string;
  name: string;
  hex: string;
};
