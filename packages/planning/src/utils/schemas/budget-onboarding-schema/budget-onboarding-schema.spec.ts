import { describe, expect, it } from "vitest";
import { getBudgetOnboardingSchema, type BudgetOnboardingFormData } from "./budget-onboarding-schema";

const t = (key: string) => key;
const schema = getBudgetOnboardingSchema(t, { email: "anna@example.com", username: "AnnaK" });

const valid: BudgetOnboardingFormData = {
  passphrase: "purple tractor sings loudly",
  passphraseConfirm: "purple tractor sings loudly",
  recoveryKeySaved: true,
  mainCurrency: "PLN",
  accountName: "mBank",
  accountCurrency: "PLN",
};

const errorsOf = (data: BudgetOnboardingFormData) => {
  const result = schema.safeParse(data);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe("budget onboarding schema", () => {
  it("accepts a complete onboarding", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("explains why a passphrase is rejected", () => {
    expect(errorsOf({ ...valid, passphrase: "short", passphraseConfirm: "short" })).toEqual({
      passphrase: "budget.validation.passphraseTooShort",
    });
    expect(errorsOf({ ...valid, passphrase: "password1234", passphraseConfirm: "password1234" })).toEqual({
      passphrase: "budget.validation.passphraseCommon",
    });
    expect(errorsOf({ ...valid, passphrase: "annak is budgeting", passphraseConfirm: "annak is budgeting" })).toEqual({
      passphrase: "budget.validation.passphraseContainsIdentity",
    });
  });

  it("requires the repeated passphrase, the saved recovery key and an account name", () => {
    expect(
      errorsOf({ ...valid, passphraseConfirm: "purple tractor sings", recoveryKeySaved: false, accountName: " " }),
    ).toEqual({
      passphraseConfirm: "budget.validation.passphraseMismatch",
      recoveryKeySaved: "budget.validation.recoveryKeySaved",
      accountName: "budget.validation.accountNameRequired",
    });
  });
});
