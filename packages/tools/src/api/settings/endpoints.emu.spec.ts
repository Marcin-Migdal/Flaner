// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import type { UserProfile } from "@flaner/shared/types";
import { setupEmulator } from "@flaner/test-utils/emulator";
import { getStartupWaste, updateStartupWaste } from "./endpoints";

const { signInAs, seed, read } = setupEmulator();

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid: "user-1",
  username: "Alice",
  usernameLower: "alice",
  avatarUrl: "",
  darkMode: true,
  language: "en",
  ...overrides,
});

describe("tools settings endpoints", () => {
  it("getStartupWaste returns the value saved on the profile", async () => {
    await seed({ "users/user-1": profile({ startupWaste: 3 }) });
    await signInAs("user-1");

    expect(await getStartupWaste("user-1")).toBe(3);
  });

  it("getStartupWaste falls back to 1.5 g when the profile has no value or does not exist", async () => {
    await seed({ "users/user-1": profile() });
    await signInAs("user-1");

    expect(await getStartupWaste("user-1")).toBe(1.5);
    expect(await getStartupWaste("user-missing")).toBe(1.5);
  });

  it("updateStartupWaste stores the value and keeps the rest of the profile", async () => {
    await seed({ "users/user-1": profile() });
    await signInAs("user-1");

    await updateStartupWaste("user-1", 2.5);

    expect(await read("users/user-1")).toEqual(profile({ startupWaste: 2.5 }));
  });

  it("updateStartupWaste cannot write someone else's profile", async () => {
    await seed({ "users/user-2": profile({ uid: "user-2", username: "Bob", usernameLower: "bob" }) });
    await signInAs("user-1");

    await expect(updateStartupWaste("user-2", 2.5)).rejects.toMatchObject({ code: "permission-denied" });
  });
});
