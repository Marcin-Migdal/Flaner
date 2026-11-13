// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import type { UserProfile } from "@flaner/shared/types";
import { setupEmulator } from "@flaner/test-utils/emulator";
import {
  createUserProfile,
  createUserProfileWithFreeUsername,
  getUserProfile,
  getUserProfiles,
  getUsernameOwner,
  searchUserProfiles,
  subscribeToUserProfiles,
  updateUserProfile,
  userProfileRef,
} from "./endpoints";

const { signInAs, seed, read, list } = setupEmulator();

const DENIED = { code: "permission-denied" };
const TAKEN = { code: "app/username-already-in-use" };

const profile = (uid: string, username: string, overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid,
  username,
  usernameLower: username.toLowerCase(),
  avatarUrl: "",
  darkMode: true,
  language: "en",
  ...overrides,
});

/** A profile together with its username reservation, as the app stores it. */
const seedUser = (uid: string, username: string, overrides: Partial<UserProfile> = {}) =>
  seed({
    [`users/${uid}`]: profile(uid, username, overrides),
    [`usernames/${username.toLowerCase()}`]: { uid },
  });

describe("user profile module", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("reading profiles", () => {
    it("getUserProfile returns the profile with its uid, or null when there is none", async () => {
      await seedUser("user-2", "Bob");
      await signInAs("user-1");

      expect(await getUserProfile("user-2")).toEqual(profile("user-2", "Bob"));
      expect(await getUserProfile("user-missing")).toBeNull();
    });

    it("getUserProfile is denied when signed out", async () => {
      await seedUser("user-2", "Bob");

      await expect(getUserProfile("user-2")).rejects.toMatchObject(DENIED);
    });

    it("getUserProfiles reads more than 30 profiles, ignores duplicates and leaves out missing ones", async () => {
      const uids = Array.from({ length: 35 }, (_, i) => `user-${String(i).padStart(2, "0")}`);
      await seed(Object.fromEntries(uids.map((uid) => [`users/${uid}`, profile(uid, `Name${uid}`)])));
      await signInAs("user-00");

      const profiles = await getUserProfiles([...uids, "user-00", "user-missing"]);

      expect(profiles.map((p) => p.uid).sort()).toEqual(uids);
      expect(await getUserProfiles([])).toEqual([]);
    });

    it("subscribeToUserProfiles emits [] at once without uids", () => {
      const onUpdate = vi.fn();

      const unsubscribe = subscribeToUserProfiles([], onUpdate, vi.fn());

      expect(onUpdate).toHaveBeenCalledWith([]);
      unsubscribe();
    });

    it("subscribeToUserProfiles emits every chunk together and pushes later changes", async () => {
      const uids = Array.from({ length: 31 }, (_, i) => `user-${String(i).padStart(2, "0")}`);
      await seed(Object.fromEntries(uids.map((uid) => [`users/${uid}`, profile(uid, `Name${uid}`)])));
      await signInAs("user-00");
      const onUpdate = vi.fn();

      const unsubscribe = subscribeToUserProfiles(uids, onUpdate, vi.fn());

      await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.arrayContaining([expect.anything()])));
      expect(onUpdate.mock.calls[0][0]).toHaveLength(31);

      await seed({ "users/user-30": profile("user-30", "Renamed") });
      await vi.waitFor(() =>
        expect(onUpdate).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ username: "Renamed" })])),
      );
      unsubscribe();
    });

    it("subscribeToUserProfiles passes a denied listener to onError", async () => {
      const onError = vi.fn();

      const unsubscribe = subscribeToUserProfiles(["user-1"], vi.fn(), onError);

      await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining(DENIED)));
      unsubscribe();
    });

    it("searchUserProfiles matches the username prefix case-insensitively, up to the limit", async () => {
      await seedUser("user-1", "Alice");
      await seedUser("user-2", "alicia");
      await seedUser("user-3", "Alfred");
      await seedUser("user-4", "Bob");
      await signInAs("user-4");

      const found = await searchUserProfiles("  ALI ", 5);

      expect(found.map((p) => p.uid).sort()).toEqual(["user-1", "user-2"]);
      expect(await searchUserProfiles("al", 1)).toHaveLength(1);
      expect(await searchUserProfiles("   ", 5)).toEqual([]);
    });

    it("userProfileRef points at users/{uid}", () => {
      expect(userProfileRef("user-1").path).toBe("users/user-1");
    });
  });

  describe("username reservation", () => {
    it("getUsernameOwner works signed out and ignores case", async () => {
      await seedUser("user-1", "Alice");

      expect(await getUsernameOwner("ALICE")).toBe("user-1");
      expect(await getUsernameOwner("nobody")).toBeNull();
    });

    it("createUserProfile stores the profile and its reservation together (sign-up)", async () => {
      await signInAs("user-1");

      const created = await createUserProfile({ uid: "user-1", username: "Alice", avatarUrl: "", darkMode: true, language: "pl" });

      expect(created).toEqual(profile("user-1", "Alice", { language: "pl" }));
      expect(await read("users/user-1")).toEqual(created);
      expect(await read("usernames/alice")).toEqual({ uid: "user-1" });
    });

    it("createUserProfile fails without writing anything when the name is reserved by someone else (sign-up race)", async () => {
      await seed({ "usernames/alice": { uid: "user-2" } });
      await signInAs("user-1");

      await expect(
        createUserProfile({ uid: "user-1", username: "Alice", avatarUrl: "", darkMode: true, language: "pl" }),
      ).rejects.toMatchObject(DENIED);
      expect(await read("users/user-1")).toBeUndefined();
    });

    it("createUserProfileWithFreeUsername takes the preferred name when it is free (first Google sign-in)", async () => {
      await signInAs("user-1");

      const created = await createUserProfileWithFreeUsername(
        { uid: "user-1", avatarUrl: "photo.png", darkMode: true, language: "en" },
        "Jan Kowalski",
      );

      expect(created.username).toBe("Jan Kowalski");
      expect(await read("users/user-1")).toEqual(created);
      expect(await read("usernames/jan kowalski")).toEqual({ uid: "user-1" });
    });

    it("createUserProfileWithFreeUsername adds a 4-digit suffix when the name is taken", async () => {
      await seed({ "usernames/jan": { uid: "user-2" } });
      await signInAs("user-1");

      const created = await createUserProfileWithFreeUsername({ uid: "user-1", avatarUrl: "", darkMode: true, language: "en" }, "Jan");

      expect(created.username).toMatch(/^Jan\d{4}$/);
      expect(await read(`usernames/${created.usernameLower}`)).toEqual({ uid: "user-1" });
    });

    it("createUserProfileWithFreeUsername reuses a reservation the user already owns", async () => {
      await seed({ "usernames/jan": { uid: "user-1" } });
      await signInAs("user-1");

      const created = await createUserProfileWithFreeUsername({ uid: "user-1", avatarUrl: "", darkMode: true, language: "en" }, "Jan");

      expect(created.username).toBe("Jan");
    });

    it("createUserProfileWithFreeUsername strips '/' and falls back to 'User' for short names", async () => {
      await signInAs("user-1");

      const created = await createUserProfileWithFreeUsername({ uid: "user-1", avatarUrl: "", darkMode: true, language: "en" }, " J/ ");

      expect(created.username).toBe("User");
    });

    it("createUserProfileWithFreeUsername gives up when every attempt is taken", async () => {
      await seed({ "usernames/jan": { uid: "user-2" } });
      // Every suffixed name is taken too
      vi.spyOn(Math, "random").mockReturnValue(0);
      await seed({ "usernames/jan1000": { uid: "user-2" } });
      await signInAs("user-1");

      await expect(
        createUserProfileWithFreeUsername({ uid: "user-1", avatarUrl: "", darkMode: true, language: "en" }, "Jan"),
      ).rejects.toMatchObject(TAKEN);
      expect(await read("users/user-1")).toBeUndefined();
    });
  });

  describe("updateUserProfile", () => {
    it("updates the given fields and keeps the rest (theme, language, startupWaste)", async () => {
      await seedUser("user-1", "Alice");
      await signInAs("user-1");

      await updateUserProfile("user-1", { darkMode: false, language: "pl", startupWaste: 2, avatarUrl: undefined });

      expect(await read("users/user-1")).toEqual(profile("user-1", "Alice", { darkMode: false, language: "pl", startupWaste: 2 }));
    });

    it("renames: reserves the new name and releases the old one", async () => {
      await seedUser("user-1", "Alice");
      await signInAs("user-1");

      await updateUserProfile("user-1", { username: "Alicia" }, "alice");

      expect(await read("users/user-1")).toMatchObject({ username: "Alicia", usernameLower: "alicia" });
      expect(await list("usernames")).toEqual({ alicia: { uid: "user-1" } });
    });

    it("renames by case only without touching the reservation", async () => {
      await seedUser("user-1", "Alice");
      await signInAs("user-1");

      await updateUserProfile("user-1", { username: "ALICE" }, "alice");

      expect(await read("users/user-1")).toMatchObject({ username: "ALICE", usernameLower: "alice" });
      expect(await list("usernames")).toEqual({ alice: { uid: "user-1" } });
    });

    it("rejects a name reserved by someone else and writes nothing", async () => {
      await seedUser("user-1", "Alice");
      await seedUser("user-2", "Bob");
      await signInAs("user-1");

      await expect(updateUserProfile("user-1", { username: "BOB", darkMode: false }, "alice")).rejects.toMatchObject(TAKEN);
      expect(await read("users/user-1")).toEqual(profile("user-1", "Alice"));
    });

    it("reserves the name of a legacy profile that has no reservation yet", async () => {
      await seed({ "users/user-1": profile("user-1", "Alice") });
      await signInAs("user-1");

      await updateUserProfile("user-1", { username: "Alice", darkMode: false }, "alice");

      expect(await read("usernames/alice")).toEqual({ uid: "user-1" });
      expect(await read("users/user-1")).toMatchObject({ darkMode: false });
    });

    it("saves a legacy profile whose unchanged name is reserved by someone else, without taking the reservation", async () => {
      await seed({ "users/user-1": profile("user-1", "Alice"), "usernames/alice": { uid: "user-2" } });
      await signInAs("user-1");

      await updateUserProfile("user-1", { username: "Alice", darkMode: false }, "alice");

      expect(await read("usernames/alice")).toEqual({ uid: "user-2" });
      expect(await read("users/user-1")).toMatchObject({ darkMode: false });
    });

    it("keeps an old reservation that belongs to someone else when renaming", async () => {
      await seed({ "users/user-1": profile("user-1", "Alice"), "usernames/alice": { uid: "user-2" } });
      await signInAs("user-1");

      await updateUserProfile("user-1", { username: "Alicia" }, "alice");

      expect(await list("usernames")).toEqual({ alice: { uid: "user-2" }, alicia: { uid: "user-1" } });
    });

    it("cannot write someone else's profile", async () => {
      await seedUser("user-2", "Bob");
      await signInAs("user-1");

      await expect(updateUserProfile("user-2", { darkMode: false })).rejects.toMatchObject(DENIED);
    });
  });
});
