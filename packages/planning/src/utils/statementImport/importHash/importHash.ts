import type { StatementTransactionRow } from "../types";

const normalize = (text: string) => text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

const sha256Hex = async (text: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * The frozen dedup hash of each row (same order), computed from the row as read from the file, before any preview
 * edit: account, date, signed amount in minor units, normalized description, balance after, and a counter that
 * tells identical rows of one file apart. Stored on the imported transaction, so a re-import finds it even after
 * the transaction was edited.
 */
export const computeImportHashes = async (rows: StatementTransactionRow[], accountId: string): Promise<string[]> => {
  const seen = new Map<string, number>();

  return Promise.all(
    rows.map((row) => {
      const key = JSON.stringify([
        accountId,
        row.date,
        row.type === "income" ? row.amount : -row.amount,
        normalize(row.sourceText),
        row.balanceAfter,
      ]);
      const counter = seen.get(key) ?? 0;
      seen.set(key, counter + 1);
      // 128 bits are plenty to tell a user's rows apart and keep the month payload small
      return sha256Hex(`${key}#${counter}`).then((hex) => hex.slice(0, 32));
    }),
  );
};
