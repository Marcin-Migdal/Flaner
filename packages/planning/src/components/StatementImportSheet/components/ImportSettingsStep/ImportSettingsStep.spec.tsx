import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import type { BudgetAccount, ImportTemplate } from "../../../../api/budget";
import { MILLENNIUM_HEADER } from "../../../../utils/statementImport/statementParser/millennium";
import { CUSTOM_MAPPING, SKIP_FILE_ACCOUNT, templateSource, type ImportSettingsFormData } from "../../../../utils/schemas";
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
      templates={[]}
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
    expect(screen.getByLabelText("PL34 … 9694")).toBeInTheDocument();
    expect(screen.getByText("2 rows")).toBeInTheDocument();
    expect(screen.getByLabelText("PL12 … 0369")).toBeInTheDocument();
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

const OTHER_HEADER = ["Data", "Kwota", "Kontrahent", "Tytuł"];
const otherFile = {
  name: "pekao.csv",
  bank: null,
  records: [OTHER_HEADER, ["03.11.2026", "-12,50", "Sklep", "Zakupy"], ["04.11.2026", "2 500,00", "Pracodawca", "Pensja"]],
};
const pekao: ImportTemplate = {
  name: "Pekao",
  header: OTHER_HEADER,
  columns: ["date", "amount", "payee", "description"],
  dateFormat: "DD.MM.YYYY",
  decimalSeparator: ",",
};

const renderOther = (props: Partial<ImportSettingsStepProps> = {}) => {
  const onSubmit = vi.fn<(settings: ImportSettingsFormData) => void>();
  renderWithProviders(
    <ImportSettingsStep
      file={otherFile}
      accounts={accounts}
      templates={[]}
      defaultValues={{ bank: CUSTOM_MAPPING, fileAccounts: [], fallbackCurrency: "PLN" }}
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

describe("ImportSettingsStep: column mapping", () => {
  it("shows each column with the first rows' values, and requires a date, an amount, a payee and a name", async () => {
    const { onSubmit } = renderOther();

    expect(screen.getByLabelText("Kontrahent")).toBeInTheDocument();
    expect(screen.getByText("Sklep · Pracodawca")).toBeInTheDocument();
    expect(screen.getByText("0 of 2 rows read with this mapping")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByText("Choose exactly one date column.")).toBeInTheDocument();
    expect(screen.getByText("Name the template.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("maps the columns with a date format and decimal separator and submits them under a name", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderOther();

    await choose(/^Data$/, "Date");
    await choose(/^Kwota$/, "Amount (minus = expense)");
    await choose(/^Kontrahent$/, "Payee");
    await choose(/^Tytuł$/, "Description");
    await choose(/Date format/, "DD.MM.YYYY (28.11.2026)");
    await user.type(screen.getByLabelText("Template name"), "Pekao");

    expect(screen.getByText("2 of 2 rows read with this mapping")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          bank: CUSTOM_MAPPING,
          mapping: {
            name: "Pekao",
            columns: ["date", "amount", "payee", "description"],
            dateFormat: "DD.MM.YYYY",
            decimalSeparator: ",",
          },
          fileAccounts: [{ fileAccount: "template", target: "main" }],
        }),
        expect.anything(),
      ),
    );
  });

  it("offers the saved templates and reads the file with the chosen one, without the mapping", async () => {
    const { onSubmit } = renderOther({
      templates: [pekao],
      defaultValues: { bank: templateSource("Pekao"), fileAccounts: [], fallbackCurrency: "PLN" },
    });

    expect(screen.getByText("Recognized from the file. Change it if it's wrong.")).toBeInTheDocument();
    expect(screen.queryByText("Column mapping")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ bank: templateSource("Pekao"), fileAccounts: [{ fileAccount: "template", target: "main" }] }),
        expect.anything(),
      ),
    );
  });
});
