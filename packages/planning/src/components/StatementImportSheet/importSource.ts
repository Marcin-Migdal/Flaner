import type { ImportTemplate } from "../../api/budget";
import { CUSTOM_MAPPING, templateSource, type ImportSettingsFormData } from "../../utils/schemas";
import {
  STATEMENT_BANKS,
  parseStatementRows,
  parseTemplateRows,
  type StatementBank,
  type StatementRow,
} from "../../utils/statementImport";

/** How the import reads the file: a bank's own parser, or an import template (`isNew`: mapped in Settings, saved on Next). */
export type ImportSource =
  | { kind: "bank"; bank: StatementBank }
  | { kind: "template"; template: ImportTemplate; isNew: boolean };

/** The Settings step's one "bank account" of a template-read file (the wizard keys its remembered target by template). */
export const TEMPLATE_FILE_ACCOUNT = "template";

type ImportMapping = ImportSettingsFormData["mapping"];

const isStatementBank = (value: string): value is StatementBank => STATEMENT_BANKS.some((bank) => bank === value);

/** The Settings choice resolved against the file's header and the saved templates; `null` when nothing is chosen. */
export const resolveImportSource = (
  { bank, mapping }: Pick<ImportSettingsFormData, "bank" | "mapping">,
  header: string[],
  templates: ImportTemplate[],
): ImportSource | null => {
  if (isStatementBank(bank)) return { kind: "bank", bank };
  if (bank === CUSTOM_MAPPING) {
    const template = { ...mapping, name: mapping.name.trim(), header: header.map((name) => name.trim()) };
    return { kind: "template", template, isNew: true };
  }
  const template = templates.find((saved) => templateSource(saved.name) === bank);
  return template ? { kind: "template", template, isNew: false } : null;
};

/** Every row after the header, read the way `source` says. */
export const readImportRows = (source: ImportSource | null, records: string[][]): StatementRow[] => {
  if (!source) return [];
  return source.kind === "bank" ? parseStatementRows(source.bank, records) : parseTemplateRows(source.template, records);
};

/** A mapping to fill in: every column ignored. */
export const blankMapping = (header: string[]): ImportMapping => ({
  name: "",
  columns: header.map(() => "ignore"),
  dateFormat: "YYYY-MM-DD",
  decimalSeparator: ",",
});

/** A saved template as a mapping to edit (saving it under the same name replaces it). */
export const mappingOf = ({ name, columns, dateFormat, decimalSeparator }: ImportTemplate): ImportMapping => ({
  name,
  columns,
  dateFormat,
  decimalSeparator,
});
