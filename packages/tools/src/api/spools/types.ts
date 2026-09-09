import type { Timestamp } from "firebase/firestore";

export type FilamentSpool = {
  id: string;
  userId: string;
  templateId: string | null;
  name: string;
  initialWeight: number;
  currentWeight: number;
  isFinished: boolean;
  finishedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  material: string;
  type: string;
  colorName: string;
  colorHex: string;
};

export type SpoolInput = {
  templateId: string;
  name: string;
  initialWeight: number;
  currentWeight: number;
};

export type SpoolPrint = {
  id: string;
  usedWeight: number;
  createdAt: Timestamp | null;
};

export type RecordUsageInput = {
  spool: FilamentSpool;
  usage: number;
};

export type RecordUsageResult = {
  isFinished: boolean;
  wentBelowZero: boolean;
  spoolId: string;
  newWeight: number;
};

export type UndoPrintInput = {
  spoolId: string;
  printId?: string;
  usedWeight?: number;
};
