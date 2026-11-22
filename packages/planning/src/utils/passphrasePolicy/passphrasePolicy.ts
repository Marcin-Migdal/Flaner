import type { PassphraseStrengthLevel } from "@flaner/ui-components";

// Budget passphrase policy (ADR 0002): at least 12 characters, no common password, nothing from the user's identity.
// Strength is an own heuristic (length, word count, character variety); no strength library.

export const PASSPHRASE_MIN_LENGTH = 12;

export type PassphraseProblem = "tooShort" | "common" | "containsIdentity";

export type PassphraseIdentity = { email?: string | null; username?: string | null };


// Letters-only cores of the most common passwords (EN + PL); digits and symbols are stripped before the lookup
const COMMON_PASSWORDS = new Set([
  "password", "passwd", "pass", "haslo", "qwerty", "qwertyuiop", "qwertz", "azerty", "asdf", "asdfgh", "asdfghjkl",
  "zxcvbn", "zxcvbnm", "qazwsx", "zaqwsx", "qazwsxedc", "zaqxsw", "iloveyou", "admin", "administrator", "letmein",
  "welcome", "monkey", "dragon", "football", "baseball", "soccer", "sunshine", "princess", "master", "shadow",
  "superman", "batman", "trustno", "starwars", "whatever", "freedom", "michael", "jennifer", "abc", "abcd", "abcdef",
  "abcdefgh", "abcdefghijkl", "login", "secret", "changeme", "default", "test", "testtest", "user", "guest",
  "kochamcie", "polska", "misiek", "witaj", "zaq", "hello", "helloworld", "flaner", "budget", "budzet", "mypassword",
  "passwordpassword", "aaaa", "qwertyqwerty", "pokemon", "minecraft", "google", "facebook",
]);

const lettersOnly = (value: string) => value.replace(/[^\p{L}]/gu, "");

const isCommon = (passphrase: string) => {
  const lower = passphrase.toLowerCase();
  const core = lettersOnly(lower);
  // A passphrase made (almost) only of digits / symbols is as guessable as a common password
  return COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(core) || core.length < 4;
};

const containsIdentity = (passphrase: string, { email, username }: PassphraseIdentity) => {
  const lower = passphrase.toLowerCase();
  const emailLower = email?.trim().toLowerCase() ?? "";
  const parts = [emailLower, emailLower.split("@")[0], username?.trim().toLowerCase() ?? ""];
  return parts.some((part) => part.length >= 3 && lower.includes(part));
};

/** The first problem that makes the passphrase unacceptable, or `null` when it is accepted. */
export const checkPassphrase = (passphrase: string, identity: PassphraseIdentity): PassphraseProblem | null => {
  if (passphrase.length < PASSPHRASE_MIN_LENGTH) return "tooShort";
  if (isCommon(passphrase)) return "common";
  if (containsIdentity(passphrase, identity)) return "containsIdentity";
  return null;
};

const CHARACTER_CLASSES = [/\p{Ll}/u, /\p{Lu}/u, /\d/, /[^\p{L}\d]/u];

/** 0 = too short, 1 = weak … 4 = very strong (the `PassphraseStrength` meter's level). */
export const getPassphraseStrength = (passphrase: string): PassphraseStrengthLevel => {
  if (passphrase.length < PASSPHRASE_MIN_LENGTH) return 0;

  const words = passphrase.split(/[\s\-_.,]+/).filter((word) => lettersOnly(word).length >= 2).length;
  const variety = CHARACTER_CLASSES.filter((pattern) => pattern.test(passphrase)).length;
  const points = [passphrase.length >= 16, passphrase.length >= 24, words >= 3, variety >= 3].filter(Boolean).length;

  const levels = [1, 2, 3, 4, 4] as const;
  return levels[points];
};
