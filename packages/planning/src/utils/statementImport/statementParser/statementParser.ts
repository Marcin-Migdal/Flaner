import type { StatementBank, StatementRow } from "../types";
import { MILLENNIUM_HEADER, parseMillenniumRow } from "./millennium";

export type StatementFile = {
  /** The bank recognized from the header, `null` when none is. */
  bank: StatementBank | null;
  /** Every record of the file, header first. */
  records: string[][];
};

const sameHeader = (header: string[], expected: string[]) =>
  header.length === expected.length && expected.every((name, index) => header[index]?.trim() === name);

/** Splits the file into records (Papa Parse, loaded on first use) and recognizes its bank from the header. */
export const readStatement = async (text: string): Promise<StatementFile> => {
  const { default: Papa } = await import("papaparse");
  const { data } = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  const header = data[0] ?? [];
  return { bank: sameHeader(header, MILLENNIUM_HEADER) ? "millennium" : null, records: data };
};

/** Reads every record after the header with the bank's parser; a row that fails is reported and the rest still read. */
export const parseStatementRows = (bank: StatementBank, records: string[][]): StatementRow[] => {
  const parsers: Record<StatementBank, (record: string[], rowNumber: number) => StatementRow> = {
    millennium: parseMillenniumRow,
  };
  // Record i is line i + 1 of the file
  return records.slice(1).map((record, index) => parsers[bank](record, index + 2));
};
