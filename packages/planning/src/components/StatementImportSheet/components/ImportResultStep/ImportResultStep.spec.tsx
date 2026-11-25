import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import type { ImportResult } from "../../types";
import { ImportResultStep } from "./ImportResultStep";

const i18n = createTestI18n({ en: { planning: en } });

const result = (overrides: Partial<ImportResult> = {}): ImportResult => ({
  imported: [{ accountName: "Main", count: 26 }],
  skipped: 0,
  duplicates: 0,
  pending: 0,
  errors: 0,
  unconfirmed: 0,
  newestMonth: "2026-10",
  ...overrides,
});

const renderStep = (value: ImportResult) =>
  renderWithProviders(<ImportResultStep result={value} onOpenMonth={vi.fn()} onClose={vi.fn()} />, {
    i18nInstance: i18n,
  });

const summaryItem = (label: string) =>
  within(screen.getByRole("list", { name: "Import summary" }))
    .getByText(label)
    .closest("li");

describe("ImportResultStep", () => {
  it("counts the rows imported to each Flaner account and the skipped bank accounts' rows", () => {
    renderStep(
      result({
        imported: [
          { accountName: "Main", count: 20 },
          { accountName: "Savings", count: 4 },
        ],
        skipped: 6,
      }),
    );

    expect(screen.getByText("24 transactions imported")).toBeInTheDocument();
    expect(summaryItem("Imported to Main")).toHaveTextContent("20");
    expect(summaryItem("Imported to Savings")).toHaveTextContent("4");
    expect(summaryItem("Rows of skipped bank accounts")).toHaveTextContent("6");
  });

  it("leaves the skipped line out when no bank account was skipped", () => {
    renderStep(result());

    expect(screen.queryByText("Rows of skipped bank accounts")).not.toBeInTheDocument();
  });
});
