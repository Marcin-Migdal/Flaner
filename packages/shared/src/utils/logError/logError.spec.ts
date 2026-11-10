import { FirebaseError } from "firebase/app";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logError } from "./logError";

vi.mock("../../firebase", () => ({ fb: { auth: { auth: { currentUser: { uid: "u1", email: "secret@x.pl" } } } } }));

describe("logError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs one collapsed group with the operation, Firebase code and uid, without the email", () => {
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    const failure = new FirebaseError("permission-denied", "Missing or insufficient permissions.");

    logError("query", failure, { operation: ["groups", "g1"], meta: { errorMessageKey: "errors.fetchError" } });

    expect(group).toHaveBeenCalledTimes(1);
    expect(group).toHaveBeenCalledWith('[flaner] query failed: ["groups","g1"] (permission-denied)');
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: '["groups","g1"]',
        code: "permission-denied",
        meta: { errorMessageKey: "errors.fetchError" },
        uid: "u1",
      }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("secret@x.pl");
    expect(error).toHaveBeenCalledWith(failure);
  });

  it("falls back to the error message when there is no operation", () => {
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    logError("global", new Error("boom"));

    expect(group).toHaveBeenCalledWith("[flaner] global failed: boom");
  });

  it("logs the same error object only once", () => {
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    const failure = new Error("boom");

    logError("mutation", failure, { operation: ["addItem"] });
    logError("global", failure);

    expect(group).toHaveBeenCalledTimes(1);
  });
});
