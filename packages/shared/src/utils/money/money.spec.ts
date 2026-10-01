import { describe, it, expect } from "vitest";
import {
  toMinorUnits,
  fromMinorUnits,
  hasAtMostTwoDecimals,
  splitEqually,
  formatMoney,
  formatMoneyList,
  getCurrencyLabel,
} from "../money";

describe("money utilities", () => {
  describe("toMinorUnits & fromMinorUnits", () => {
    it("converts major units to minor units (cents/grosze)", () => {
      expect(toMinorUnits(10.5)).toBe(1050);
      expect(toMinorUnits(0.99)).toBe(99);
      expect(toMinorUnits(0)).toBe(0);
    });

    it("converts minor units back to major units", () => {
      expect(fromMinorUnits(1050)).toBe(10.5);
      expect(fromMinorUnits(99)).toBe(0.99);
      expect(fromMinorUnits(0)).toBe(0);
    });
  });

  describe("hasAtMostTwoDecimals", () => {
    it("returns true for numbers with two or fewer decimal places", () => {
      expect(hasAtMostTwoDecimals(10)).toBe(true);
      expect(hasAtMostTwoDecimals(10.5)).toBe(true);
      expect(hasAtMostTwoDecimals(10.55)).toBe(true);
    });

    it("returns false for numbers with more than two decimal places", () => {
      expect(hasAtMostTwoDecimals(10.555)).toBe(false);
      expect(hasAtMostTwoDecimals(0.1234)).toBe(false);
    });
  });

  describe("splitEqually", () => {
    it("returns empty array when userIds is empty", () => {
      expect(splitEqually(100, [])).toEqual([]);
    });

    it("splits evenly when divisible without remainder", () => {
      const result = splitEqually(300, ["user-1", "user-2", "user-3"]);
      expect(result).toEqual([
        { userId: "user-1", amount: 100 },
        { userId: "user-2", amount: 100 },
        { userId: "user-3", amount: 100 },
      ]);
    });

    it("distributes remainder in minor units correctly so total always matches", () => {
      const result = splitEqually(100, ["user-1", "user-2", "user-3"]);
      expect(result).toEqual([
        { userId: "user-1", amount: 34 },
        { userId: "user-2", amount: 33 },
        { userId: "user-3", amount: 33 },
      ]);
      const total = result.reduce((sum, item) => sum + item.amount, 0);
      expect(total).toBe(100);
    });
  });

  describe("formatMoney", () => {
    it("formats minor units as formatted currency string", () => {
      const formatted = formatMoney(1250, "EUR", "en-US");
      expect(formatted.replace(/\u00a0/g, " ")).toContain("€12.50");
    });
  });

  describe("formatMoneyList", () => {
    it("returns zero amount in primary currency if amounts are empty or all zeroes", () => {
      const formatted = formatMoneyList({}, "PLN", "en-US");
      expect(formatted.replace(/\u00a0/g, " ")).toContain("0.00");

      const allZeroes = formatMoneyList({ USD: 0, EUR: 0 }, "USD", "en-US");
      expect(allZeroes.replace(/\u00a0/g, " ")).toContain("0.00");
    });

    it("formats multiple currencies with primary currency first", () => {
      const formatted = formatMoneyList(
        { EUR: 2000, PLN: 4500, USD: 1000 },
        "PLN",
        "en-US"
      );
      const normalized = formatted.replace(/\u00a0/g, " ");
      expect(normalized).toContain("·");
      const parts = normalized.split(" · ");
      expect(parts[0]).toContain("45.00");
      expect(parts[1]).toContain("20.00");
      expect(parts[2]).toContain("10.00");
    });
  });

  describe("getCurrencyLabel", () => {
    it("returns currency code with full name", () => {
      const label = getCurrencyLabel("USD", "en-US");
      expect(label).toBe("USD · US Dollar");

      const plnLabel = getCurrencyLabel("PLN", "pl");
      expect(plnLabel).toContain("PLN");
      expect(plnLabel).toContain("złoty");
    });
  });
});
