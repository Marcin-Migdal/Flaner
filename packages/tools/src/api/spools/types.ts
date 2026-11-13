export type FilamentSpool = {
  id: string;
  userId: string;
  templateId: string | null;
  name: string;
  initialWeight: number;
  currentWeight: number;
  isFinished: boolean;
  finishedAt?: number | null;
  createdAt?: number | null;
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
  createdAt: number | null;
};

export type RecordUsageInput = {
  spoolId: string;
  usage: number;
};

/** Read from the transaction: the spool after the print and what it could not cover (goes onto the next spool). */
export type RecordUsageResult = {
  spool: FilamentSpool;
  carryover: number;
};

export type UndoPrintInput = {
  spoolId: string;
  printId?: string;
};
