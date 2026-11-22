// @vitest-environment node
// Web Crypto in jsdom rejects buffers from the Node realm, so this spec runs without a DOM
import { describe, expect, it } from "vitest";
import {
  decryptJson,
  derivePassphraseKey,
  deriveRecoveryKey,
  encryptJson,
  generateDataKey,
  generateRecoveryKey,
  generateSalt,
  nonExtractableCopy,
  parseRecoveryKey,
  unwrapDataKey,
  wrapDataKey,
} from "./budgetCrypto";

// Fewer PBKDF2 rounds keep the spec fast; production always uses KDF_ITERATIONS
const FAST_ITERATIONS = 1_000;

describe("budgetCrypto", () => {
  describe("JSON payloads", () => {
    it("decrypts what it encrypted with the same key and document id", async () => {
      const key = await generateDataKey();
      const payload = { name: "mBank", amounts: [12.5, -3], nested: { ok: true } };

      const sealed = await encryptJson(payload, key, "budget_accounts/acc-1");

      expect(await decryptJson(sealed, key, "budget_accounts/acc-1")).toEqual(payload);
    });

    it("never produces the same ciphertext twice (random IV)", async () => {
      const key = await generateDataKey();

      const first = await encryptJson({ name: "Cash" }, key, "doc");
      const second = await encryptJson({ name: "Cash" }, key, "doc");

      expect(first).not.toEqual(second);
    });

    it("fails with a wrong key", async () => {
      const sealed = await encryptJson({ name: "Cash" }, await generateDataKey(), "doc");

      await expect(decryptJson(sealed, await generateDataKey(), "doc")).rejects.toThrow();
    });

    it("fails with a wrong document id", async () => {
      const key = await generateDataKey();
      const sealed = await encryptJson({ name: "Cash" }, key, "budget_accounts/acc-1");

      await expect(decryptJson(sealed, key, "budget_accounts/acc-2")).rejects.toThrow();
    });
  });

  describe("key wrapping", () => {
    it("unwraps a key wrapped by the passphrase key only with the same passphrase", async () => {
      const salt = generateSalt();
      const userKey = await generateDataKey();
      const passphraseKey = await derivePassphraseKey("correct horse battery", salt, FAST_ITERATIONS);
      const wrapped = await wrapDataKey(userKey, passphraseKey, "budget_keys/u1");

      const unwrapped = await unwrapDataKey(
        wrapped,
        await derivePassphraseKey("correct horse battery", salt, FAST_ITERATIONS),
        "budget_keys/u1",
      );
      const sealed = await encryptJson({ check: 1 }, userKey, "doc");
      expect(await decryptJson(sealed, unwrapped, "doc")).toEqual({ check: 1 });

      const wrongKey = await derivePassphraseKey("wrong horse battery", salt, FAST_ITERATIONS);
      await expect(unwrapDataKey(wrapped, wrongKey, "budget_keys/u1")).rejects.toThrow();
    });

    it("unwraps with the recovery key typed without dashes and in lower case", async () => {
      const recoveryKey = generateRecoveryKey();
      const userKey = await generateDataKey();
      const wrapped = await wrapDataKey(userKey, await deriveRecoveryKey(recoveryKey), "budget_keys/u1");

      const typed = parseRecoveryKey(recoveryKey.replace(/-/g, "").toLowerCase());
      expect(typed).not.toBeNull();
      const unwrapped = await unwrapDataKey(wrapped, await deriveRecoveryKey(typed ?? ""), "budget_keys/u1");

      const sealed = await encryptJson({ check: 2 }, unwrapped, "doc");
      expect(await decryptJson(sealed, userKey, "doc")).toEqual({ check: 2 });
    });
  });

  describe("recovery key", () => {
    it("is shown in groups of four characters", () => {
      expect(generateRecoveryKey()).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/);
    });

    it("parses regardless of dashes, spaces and case", () => {
      const key = "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-6789";

      expect(parseRecoveryKey(key)).toBe(key);
      expect(parseRecoveryKey(" abcdefghjkmnpqrstvwxyz0123456789 ")).toBe(key);
      expect(parseRecoveryKey("abcd efgh-jkmn pqrs tvwx yz01 2345 6789")).toBe(key);
    });

    it("rejects input of the wrong length or with unknown characters", () => {
      expect(parseRecoveryKey("ABCD-EFGH")).toBeNull();
      expect(parseRecoveryKey("ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-678U")).toBeNull();
    });
  });

  describe("nonExtractableCopy", () => {
    it("decrypts what the original encrypted and cannot be exported", async () => {
      const key = await generateDataKey();
      const sealed = await encryptJson({ amount: 12.5 }, key, "budget_profiles/u1");

      const copy = await nonExtractableCopy(key);

      expect(await decryptJson(sealed, copy, "budget_profiles/u1")).toEqual({ amount: 12.5 });
      await expect(crypto.subtle.exportKey("raw", copy)).rejects.toThrow();
    });
  });
});
