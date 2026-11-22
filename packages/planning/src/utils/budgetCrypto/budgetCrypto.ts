/**
 * Budget crypto (ADR 0002): Web Crypto only, no dependency.
 * - The passphrase key (PBKDF2-SHA256) and the recovery key (HKDF-SHA256) only wrap the user key.
 * - The user key encrypts the per-user documents and wraps the per-account data keys.
 * - Every ciphertext is "sealed": a random 12-byte IV followed by the AES-GCM output, bound to its
 *   document path as associated data (never the owner / members, so a shared account still decrypts).
 */

export const KDF_ITERATIONS = 600_000;
export const SALT_BYTES = 16;

const IV_BYTES = 12;
const RECOVERY_KEY_BYTES = 20;
// Crockford base32: no I, L, O, U, so the key reads unambiguously
const RECOVERY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RECOVERY_GROUP = 4;
const RECOVERY_INFO = "flaner-budget-recovery-key";

/** 12-byte IV followed by the AES-GCM ciphertext. */
export type Sealed = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

const gcm = (iv: Uint8Array<ArrayBuffer>, aad: string): AesGcmParams => ({
  name: "AES-GCM",
  iv,
  additionalData: encoder.encode(aad),
});

const seal = (iv: Uint8Array<ArrayBuffer>, ciphertext: ArrayBuffer): Sealed => {
  const sealed = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  sealed.set(iv);
  sealed.set(new Uint8Array(ciphertext), IV_BYTES);
  return sealed;
};

// Copies, so a view on a shared / foreign buffer (Firestore `Bytes`) is always accepted by Web Crypto
const unseal = (sealed: Uint8Array) => ({
  iv: new Uint8Array(sealed.slice(0, IV_BYTES)),
  ciphertext: new Uint8Array(sealed.slice(IV_BYTES)),
});

const DATA_KEY: AesKeyGenParams = { name: "AES-GCM", length: 256 };
const DATA_KEY_USAGES: KeyUsage[] = ["encrypt", "decrypt", "wrapKey", "unwrapKey"];
const WRAPPING_KEY_USAGES: KeyUsage[] = ["wrapKey", "unwrapKey"];

export const generateSalt = () => randomBytes(SALT_BYTES);

/** A random AES-GCM key: the user key or an account's data key. Extractable, so it can be re-wrapped. */
export const generateDataKey = () => crypto.subtle.generateKey(DATA_KEY, true, DATA_KEY_USAGES);

export const derivePassphraseKey = async (
  passphrase: string,
  salt: Uint8Array,
  iterations: number = KDF_ITERATIONS,
): Promise<CryptoKey> => {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations },
    material,
    DATA_KEY,
    false,
    WRAPPING_KEY_USAGES,
  );
};

/** The recovery key is high-entropy (160 bits), so HKDF is enough. Takes a key normalized by `parseRecoveryKey`. */
export const deriveRecoveryKey = async (recoveryKey: string): Promise<CryptoKey> => {
  const material = await crypto.subtle.importKey("raw", encoder.encode(recoveryKey), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: encoder.encode(RECOVERY_INFO) },
    material,
    DATA_KEY,
    false,
    WRAPPING_KEY_USAGES,
  );
};

export const wrapDataKey = async (key: CryptoKey, wrappingKey: CryptoKey, aad: string): Promise<Sealed> => {
  const iv = randomBytes(IV_BYTES);
  return seal(iv, await crypto.subtle.wrapKey("raw", key, wrappingKey, gcm(iv, aad)));
};

/** Rejects when the wrapping key or the document path is wrong. */
export const unwrapDataKey = (sealed: Uint8Array, wrappingKey: CryptoKey, aad: string): Promise<CryptoKey> => {
  const { iv, ciphertext } = unseal(sealed);
  return crypto.subtle.unwrapKey("raw", ciphertext, wrappingKey, gcm(iv, aad), DATA_KEY, true, DATA_KEY_USAGES);
};

export const encryptJson = async <T>(value: T, key: CryptoKey, aad: string): Promise<Sealed> => {
  const iv = randomBytes(IV_BYTES);
  return seal(iv, await crypto.subtle.encrypt(gcm(iv, aad), key, encoder.encode(JSON.stringify(value))));
};

/** Rejects when the key or the document path is wrong, or the ciphertext was changed. */
export const decryptJson = async <T>(sealed: Uint8Array, key: CryptoKey, aad: string): Promise<T> => {
  const { iv, ciphertext } = unseal(sealed);
  return JSON.parse(decoder.decode(await crypto.subtle.decrypt(gcm(iv, aad), key, ciphertext)));
};

const groupRecoveryKey = (chars: string) => chars.match(new RegExp(`.{${RECOVERY_GROUP}}`, "g"))?.join("-") ?? "";

/** A new recovery key, formatted for display: 32 base32 characters in groups of four. */
export const generateRecoveryKey = () =>
  groupRecoveryKey(
    Array.from(randomBytes(RECOVERY_KEY_BYTES), (byte) => byte.toString(2).padStart(8, "0"))
      .join("")
      .match(/.{5}/g)
      ?.map((bits) => RECOVERY_ALPHABET[parseInt(bits, 2)])
      .join("") ?? "",
  );

/**
 * Normalizes a typed recovery key to its display form, or `null` when it cannot be one.
 * Dashes, spaces and case are ignored; the look-alikes O / I / L read as 0 / 1.
 */
export const parseRecoveryKey = (input: string): string | null => {
  const chars = input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  const length = (RECOVERY_KEY_BYTES * 8) / 5;
  if (chars.length !== length || [...chars].some((char) => !RECOVERY_ALPHABET.includes(char))) return null;
  return groupRecoveryKey(chars);
};
