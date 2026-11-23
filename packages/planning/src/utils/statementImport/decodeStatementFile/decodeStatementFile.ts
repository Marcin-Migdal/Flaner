/**
 * The text of a bank statement file: UTF-8 when the bytes are valid UTF-8 (the byte order mark is dropped),
 * otherwise windows-1250, the encoding Polish banks use for older exports.
 */
export const decodeStatementFile = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1250").decode(bytes);
  }
};
