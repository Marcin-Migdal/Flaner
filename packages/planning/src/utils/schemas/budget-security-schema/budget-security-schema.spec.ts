import { describe, expect, it } from "vitest";
import {
  getBudgetChangePassphraseSchema,
  getBudgetResetSchema,
  type BudgetChangePassphraseFormData,
} from "./budget-security-schema";

const t = (key: string) => key;

describe("budget change passphrase schema", () => {
  const schema = getBudgetChangePassphraseSchema(t, { email: "anna@example.com" });
  const valid: BudgetChangePassphraseFormData = {
    method: "passphrase",
    current: "purple tractor sings loudly",
    passphrase: "green kettle hums softly",
    passphraseConfirm: "green kettle hums softly",
  };
  const errorsOf = (data: BudgetChangePassphraseFormData) => {
    const result = schema.safeParse(data);
    return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
  };

  it("accepts the current passphrase or a recovery key in any formatting", () => {
    expect(errorsOf(valid)).toEqual({});
    expect(errorsOf({ ...valid, method: "recoveryKey", current: "abcdefghjkmnpqrstvwxyz0123456789" })).toEqual({});
  });

  it("asks for the secret of the chosen method and checks the recovery key's form", () => {
    expect(errorsOf({ ...valid, current: "" })).toEqual({ current: "budget.validation.passphraseRequired" });
    expect(errorsOf({ ...valid, method: "recoveryKey", current: "" })).toEqual({
      current: "budget.validation.recoveryKeyRequired",
    });
    expect(errorsOf({ ...valid, method: "recoveryKey", current: "ABCD-EFGH" })).toEqual({
      current: "budget.validation.recoveryKeyInvalid",
    });
  });

  it("applies the passphrase policy to the new passphrase and checks its repetition", () => {
    expect(errorsOf({ ...valid, passphrase: "short", passphraseConfirm: "short" })).toEqual({
      passphrase: "budget.validation.passphraseTooShort",
    });
    expect(errorsOf({ ...valid, passphraseConfirm: "something else" })).toEqual({
      passphraseConfirm: "budget.validation.passphraseMismatch",
    });
  });
});

describe("budget reset schema", () => {
  it("accepts only the confirmation word, ignoring case and spaces", () => {
    const schema = getBudgetResetSchema(t, "RESETUJ");

    expect(schema.safeParse({ confirmation: " resetuj " }).success).toBe(true);
    expect(schema.safeParse({ confirmation: "RESET" }).success).toBe(false);
    expect(schema.safeParse({ confirmation: "" }).success).toBe(false);
  });
});
