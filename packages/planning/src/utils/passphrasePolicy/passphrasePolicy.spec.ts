import { describe, expect, it } from "vitest";
import { checkPassphrase, getPassphraseStrength } from "./passphrasePolicy";

const user = { email: "anna.kowalska@example.com", username: "AnnaK" };

describe("checkPassphrase", () => {
  it("accepts a long passphrase unrelated to the user", () => {
    expect(checkPassphrase("purple tractor sings loudly", user)).toBeNull();
  });

  it("rejects fewer than 12 characters", () => {
    expect(checkPassphrase("short pass1", user)).toBe("tooShort");
    expect(checkPassphrase("exactly12chr", user)).toBeNull();
  });

  it("rejects common passwords, also with digits or symbols around them", () => {
    expect(checkPassphrase("password1234", user)).toBe("common");
    expect(checkPassphrase("Qwertyuiop!!", user)).toBe("common");
    expect(checkPassphrase("123456789012", user)).toBe("common");
  });

  it("rejects a passphrase containing the email, its name part or the username", () => {
    expect(checkPassphrase("x anna.kowalska@example.com", user)).toBe("containsIdentity");
    expect(checkPassphrase("my Anna.Kowalska secret", user)).toBe("containsIdentity");
    expect(checkPassphrase("the annak budget 2026", user)).toBe("containsIdentity");
  });
});

describe("getPassphraseStrength", () => {
  it("is 0 for anything too short", () => {
    expect(getPassphraseStrength("")).toBe(0);
    expect(getPassphraseStrength("Ab1!")).toBe(0);
  });

  it("grows with length, word count and character variety", () => {
    const scores = [
      "abcdefghijkl", // long enough, one word, one class
      "abcdefghijklmnop", // longer
      "Abcdefgh1jklmnop", // + variety
      "Purple tractor sings 4 loudly!", // long, many words, varied
    ].map(getPassphraseStrength);

    expect(scores).toEqual([1, 2, 3, 4]);
  });
});
