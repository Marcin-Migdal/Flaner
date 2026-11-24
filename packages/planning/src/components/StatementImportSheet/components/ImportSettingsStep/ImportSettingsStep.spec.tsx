import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import type { BudgetAccount } from "../../../../api/budget";
import { MILLENNIUM_HEADER } from "../../../../utils/statementImport/statementParser/millennium";
import { SKIP_FILE_ACCOUNT, type ImportSettingsFormData } from "../../../../utils/schemas";
import { ImportSettingsStep, type ImportSettingsStepProps } from "./ImportSettingsStep";

const i18n = createTestI18n({ en: { planning: en } });

const CHECKING = "PL34 0215 8418 3495 1552 2867 9694";
const SAVINGS = "PL12 9594 8546 4581 7280 7584 0369";

const record = (fileAccount: string, date: string) => [
  fileAccount, date, date, "PRZELEW", "", "Shop", "Note", "-10.00", "", "100.00", "PLN",
];

const account = (id: string, name: string): BudgetAccount => ({
  id,
  name,
  defaultCurrency: "PLN",
  hidden: false,
  createdAt: 1,
});

const accounts = [account("main", "Main"), account("savings", "Savings")];

const renderStep = (fileAccounts: string[], props: Partial<ImportSettingsStepProps> = {}) => {
  const onSubmit = vi.fn<(settings: ImportSettingsFormData) => void>();
  renderWithProviders(
    <ImportSettingsStep
      file={{
        name: "statement.csv",
        bank: "millennium",
        records: [MILLENNIUM_HEADER, ...fileAccounts.map((fileAccount, index) => record(fileAccount, `2026-10-0${index + 1}`))],
      }}
      accounts={accounts}
      defaultValues={{ bank: "millennium", fileAccounts: [], fallbackCurrency: "PLN" }}
      defaultTarget={(_fileAccount, isOnlyAccount) => (isOnlyAccount ? "main" : "")}
      isBusy={false}
      error={null}
      onBack={vi.fn()}
      onSubmit={onSubmit}
      {...props}
    />,
    { i18nInstance: i18n },
  );
  return { onSubmit };
};

const choose = async (label: RegExp, option: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole("option", { name: option }));
};

describe("ImportSettingsStep", () => {
  it("a one-account file goes to one Flaner account, preselected", async () => {
    const { onSubmit } = renderStep([CHECKING, CHECKING]);

    expect(screen.queryByText("Bank accounts in this file")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ fileAccounts: [{ fileAccount: CHECKING, target: "main" }] }),
        expect.anything(),
      ),
    );
  });

  it("lists each bank account of a multi-account file, masked, with its row count", () => {
    renderStep([CHECKING, CHECKING, SAVINGS]);

    expect(screen.getByText("Bank accounts in this file")).toBeInTheDocument();
    expect(screen.getByLabelText("•••• 9694")).toBeInTheDocument();
    expect(screen.getByText("2 rows")).toBeInTheDocument();
    expect(screen.getByLabelText("•••• 0369")).toBeInTheDocument();
    expect(screen.getByText("1 row")).toBeInTheDocument();
  });

  it("requires a choice for every bank account with no remembered mapping", async () => {
    const { onSubmit } = renderStep([CHECKING, SAVINGS]);

    await userEvent.setup().click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findAllByText("Choose an account.")).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("maps one bank account to a Flaner account and skips the other", async () => {
    const { onSubmit } = renderStep([CHECKING, SAVINGS]);

    await choose(/9694/, "Savings");
    await choose(/0369/, "Don't import");
    await userEvent.setup().click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fileAccounts: [
            { fileAccount: CHECKING, target: "savings" },
            { fileAccount: SAVINGS, target: SKIP_FILE_ACCOUNT },
          ],
        }),
        expect.anything(),
      ),
    );
  });

  it("preselects the remembered targets", async () => {
    const remembered: Record<string, string> = { [CHECKING]: "savings", [SAVINGS]: SKIP_FILE_ACCOUNT };
    renderStep([CHECKING, SAVINGS], { defaultTarget: (fileAccount) => remembered[fileAccount] ?? "" });

    expect(await screen.findByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Don't import")).toBeInTheDocument();
  });
});
