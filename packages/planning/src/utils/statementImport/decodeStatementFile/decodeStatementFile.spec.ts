import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeStatementFile } from "./decodeStatementFile";

// "Zażółć gęślą jaźń" in windows-1250
const WINDOWS_1250 = new Uint8Array([
  0x5a, 0x61, 0xbf, 0xf3, 0xb3, 0xe6, 0x20, 0x67, 0xea, 0x9c, 0x6c, 0xb9, 0x20, 0x6a, 0x61, 0x9f, 0xf1,
]);

describe("decodeStatementFile", () => {
  it("reads UTF-8 and drops the byte order mark", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("Zażółć gęślą jaźń")]);
    expect(decodeStatementFile(bytes)).toBe("Zażółć gęślą jaźń");
  });

  it("falls back to windows-1250 when the bytes are not valid UTF-8", () => {
    expect(decodeStatementFile(WINDOWS_1250)).toBe("Zażółć gęślą jaźń");
  });

  it("keeps the Polish characters of the Millennium fixture", () => {
    const fixture = readFileSync(
      resolve(__dirname, "../../../../../../fixtures/bank-statements/millennium/millennium-2026-11.csv"),
    );
    const text = decodeStatementFile(new Uint8Array(fixture));
    expect(text.startsWith('"Numer rachunku/karty"')).toBe(true);
    expect(text).toContain("Obciążenia");
  });
});
