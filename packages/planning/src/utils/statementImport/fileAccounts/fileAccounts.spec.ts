import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeStatementFile } from "../decodeStatementFile";
import { parseStatementRows, readStatement } from "../statementParser";
import { countFileAccountRows, maskFileAccount, splitRowsByFileAccount } from "./fileAccounts";

const CHECKING = "PL34 0215 8418 3495 1552 2867 9694";
const SAVINGS = "PL12 9594 8546 4581 7280 7584 0369";

const fixtureRows = async (month: string) => {
  const text = decodeStatementFile(
    new Uint8Array(
      readFileSync(resolve(__dirname, `../../../../../../fixtures/bank-statements/millennium/millennium-${month}.csv`)),
    ),
  );
  const { records } = await readStatement(text);
  return parseStatementRows("millennium", records);
};

describe("countFileAccountRows", () => {
  it("lists both bank accounts of the Millennium export in file order, with their rows", async () => {
    const counts = countFileAccountRows(await fixtureRows("2026-10"));

    expect([...counts.keys()]).toEqual([CHECKING, SAVINGS]);
    expect(counts.get(CHECKING)).toBe(26);
    expect(counts.get(SAVINGS)).toBe(4);
  });

  it("ignores rows that couldn't be read", () => {
    expect(countFileAccountRows([{ status: "error", rowNumber: 2, reason: "date" }]).size).toBe(0);
  });
});

describe("maskFileAccount", () => {
  it("keeps only the first and last four characters", () => {
    expect(maskFileAccount(CHECKING)).toBe("PL34 … 9694");
  });

  it("leaves a short number as it is", () => {
    expect(maskFileAccount("1234")).toBe("1234");
  });
});

describe("splitRowsByFileAccount", () => {
  it("feeds each bank account to its Flaner account", async () => {
    const rows = await fixtureRows("2026-10");
    const { groups, skipped } = splitRowsByFileAccount(rows, { [CHECKING]: "main", [SAVINGS]: "savings" });

    expect(groups.map((group) => group.accountId)).toEqual(["main", "savings"]);
    expect(groups[0].rows.every((row) => row.fileAccount === CHECKING)).toBe(true);
    expect(groups[1].rows.every((row) => row.fileAccount === SAVINGS)).toBe(true);
    expect(groups[0].rows.length + groups[1].rows.length).toBe(30);
    expect(skipped).toBe(0);
  });

  it("counts the rows of a skipped bank account and imports none of them", async () => {
    const rows = await fixtureRows("2026-10");
    const savingsRows = rows.filter((row) => row.status === "ok" && row.fileAccount === SAVINGS).length;
    const { groups, skipped } = splitRowsByFileAccount(rows, { [CHECKING]: "main", [SAVINGS]: null });

    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(30 - savingsRows);
    expect(skipped).toBe(savingsRows);
  });

  it("merges bank accounts mapped to one Flaner account", async () => {
    const { groups } = splitRowsByFileAccount(await fixtureRows("2026-10"), { [CHECKING]: "main", [SAVINGS]: "main" });

    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(30);
  });

  it("skips a bank account with no target", async () => {
    const { groups, skipped } = splitRowsByFileAccount(await fixtureRows("2026-09"), {});

    expect(groups).toEqual([]);
    expect(skipped).toBe(30);
  });
});
