// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import type { UserProfile } from "@flaner/shared/types";
import { setupEmulator } from "@flaner/test-utils/emulator";
import { getEventParticipantsProfiles, getGroupMembersAsParticipants, searchParticipants } from "./endpoints";

const { signInAs, seed } = setupEmulator();

const profile = (uid: string, username: string, avatarUrl = ""): UserProfile => ({
  uid,
  username,
  usernameLower: username.toLowerCase(),
  avatarUrl,
  darkMode: true,
  language: "en",
});

const userParticipant = (uid: string, username: string, avatarUrl = "") => ({
  type: "user",
  id: uid,
  name: username,
  username,
  usernameLower: username.toLowerCase(),
  avatarUrl,
});

const group = (id: string, name: string, type: "public" | "private", ownerId = "owner") => ({
  id,
  name,
  nameLower: name.toLowerCase(),
  description: "",
  type,
  requiresApproval: false,
  ownerId,
  avatarUrl: null,
  createdAt: 1,
  updatedAt: 1,
});

const member = (userId: string, role = "member") => ({ userId, role, joinedAt: 1 });

describe("participants endpoints", () => {
  describe("searchParticipants", () => {
    it("returns nothing for a blank query", async () => {
      await signInAs("user-1");

      expect(await searchParticipants("   ", "user-1")).toEqual([]);
    });

    it("finds users and public groups by prefix, without the searching user", async () => {
      await seed({
        "users/user-1": profile("user-1", "Alice", "alice.png"),
        "users/user-2": profile("user-2", "Albert"),
        "users/user-3": profile("user-3", "Bob"),
        "groups/g-public": group("g-public", "Alpinists", "public"),
        "groups/g-private": group("g-private", "Alchemists", "private"),
      });
      await signInAs("user-2");

      const results = await searchParticipants("al", "user-2");

      expect(results).toEqual([
        userParticipant("user-1", "Alice", "alice.png"),
        { type: "group", id: "g-public", name: "Alpinists", avatarUrl: null },
      ]);
    });

    it("includes the user's own private groups matching the query, once", async () => {
      await seed({
        "groups/g-private": group("g-private", "Secret Club", "private"),
        "groups/g-private/members/user-1": member("user-1"),
        "groups/g-other": group("g-other", "Secret Society", "private"),
        "groups/g-public": group("g-public", "Secret Garden", "public"),
        "groups/g-public/members/user-1": member("user-1"),
      });
      await signInAs("user-1");

      const results = await searchParticipants("secret", "user-1");

      expect(results.map((r) => r.id).sort()).toEqual(["g-private", "g-public"]);
    });

    it("skips private groups when no user is given", async () => {
      await seed({
        "groups/g-private": group("g-private", "Secret Club", "private"),
        "groups/g-private/members/user-1": member("user-1"),
      });
      await signInAs("user-1");

      expect(await searchParticipants("secret")).toEqual([]);
    });
  });

  describe("getGroupMembersAsParticipants", () => {
    it("returns the members' profiles with the group name", async () => {
      await seed({
        "groups/g-1": group("g-1", "Board Game Club", "private", "user-1"),
        "groups/g-1/members/user-1": member("user-1", "owner"),
        "groups/g-1/members/user-2": member("user-2"),
        "users/user-1": profile("user-1", "Alice", "alice.png"),
        "users/user-2": profile("user-2", "Bob"),
      });
      await signInAs("user-1");

      const results = await getGroupMembersAsParticipants("g-1", "Board Game Club");

      expect(results).toEqual([
        { ...userParticipant("user-1", "Alice", "alice.png"), groupName: "Board Game Club" },
        { ...userParticipant("user-2", "Bob"), groupName: "Board Game Club" },
      ]);
    });

    it("rejects when the user may not read the members", async () => {
      await seed({
        "groups/g-1": group("g-1", "Board Game Club", "private"),
        "groups/g-1/members/user-2": member("user-2"),
      });
      await signInAs("user-1");

      await expect(getGroupMembersAsParticipants("g-1", "Board Game Club")).rejects.toMatchObject({ code: "permission-denied" });
    });
  });

  describe("getEventParticipantsProfiles", () => {
    it("returns the profiles of more than 30 participants, without missing accounts", async () => {
      const uids = Array.from({ length: 32 }, (_, i) => `user-${String(i).padStart(2, "0")}`);
      await seed(Object.fromEntries(uids.map((uid) => [`users/${uid}`, profile(uid, `Name${uid}`)])));
      await signInAs("user-00");

      const results = await getEventParticipantsProfiles([...uids, "user-deleted"]);

      expect(results.map((r) => r.id).sort()).toEqual(uids);
      expect(results[0]).toEqual(userParticipant("user-00", "Nameuser-00"));
      expect(await getEventParticipantsProfiles([])).toEqual([]);
    });
  });
});
