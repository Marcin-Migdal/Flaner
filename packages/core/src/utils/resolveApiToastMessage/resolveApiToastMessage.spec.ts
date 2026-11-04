import { FirebaseError } from "firebase/app";
import { resolveApiToastMessage } from "./resolveApiToastMessage";

const t = (key: string) => `t(${key})`;

describe("resolveApiToastMessage", () => {
  it("maps a Firestore permission-denied error by its code", () => {
    const error = new FirebaseError("permission-denied", "Missing or insufficient permissions.");

    expect(resolveApiToastMessage(t, "errors.mutationError", error, "errors.mutationError")).toBe(
      "t(errors.permissionDenied)",
    );
  });

  it("translates an error message that is an i18n key, incl. a namespace", () => {
    expect(resolveApiToastMessage(t, "errors.mutationError", new Error("community:errors.notGroupMember"))).toBe(
      "t(community:errors.notGroupMember)",
    );
  });

  it("uses the meta key for any other error", () => {
    expect(resolveApiToastMessage(t, "errors.mutationError", new Error("Network down"), "errors.fetchError")).toBe(
      "t(errors.mutationError)",
    );
    expect(
      resolveApiToastMessage(t, undefined, new FirebaseError("unavailable", "offline"), "errors.fetchError"),
    ).toBe("t(errors.fetchError)");
  });

  it("returns undefined without an error, meta key or fallback", () => {
    expect(resolveApiToastMessage(t)).toBeUndefined();
  });
});
