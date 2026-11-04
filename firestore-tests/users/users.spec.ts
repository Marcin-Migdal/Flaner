import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";

const ALICE = "alice-uid";
const BOB = "bob-uid";

const profile = (uid: string, username: string) => ({
  uid,
  username,
  usernameLower: username.toLowerCase(),
  avatarUrl: "",
  darkMode: true,
  language: "pl",
});

const { as, anonymous, seed } = useTestEnv();

describe("users/{userId}", () => {
  beforeEach(async () => {
    await seed({ [`users/${BOB}`]: profile(BOB, "Bob") });
  });

  it("lets a signed-in user read another profile", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "users", BOB)));
  });

  it("blocks unauthenticated reads", async () => {
    await assertFails(getDoc(doc(anonymous(), "users", BOB)));
  });

  it("accepts the first Google sign-in batch: profile + reservation (createProfileWithReservation)", async () => {
    await seed({ "usernames/alice": { uid: BOB } });
    const db = as(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, "users", ALICE), profile(ALICE, "Alice4821"));
    batch.set(doc(db, "usernames", "alice4821"), { uid: ALICE });

    await assertSucceeds(batch.commit());
  });

  it("blocks the Google sign-in batch when the display name is already reserved", async () => {
    await seed({ "usernames/alice": { uid: BOB } });
    const db = as(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, "users", ALICE), profile(ALICE, "Alice"));
    batch.set(doc(db, "usernames", "alice"), { uid: ALICE });

    await assertFails(batch.commit());
  });

  it("blocks creating a profile without a username reservation", async () => {
    await assertFails(setDoc(doc(as(ALICE), "users", ALICE), profile(ALICE, "Alice")));
  });

  it("blocks a profile whose usernameLower does not match the username", async () => {
    const db = as(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, "users", ALICE), { ...profile(ALICE, "Alice"), usernameLower: "mallory" });
    batch.set(doc(db, "usernames", "mallory"), { uid: ALICE });

    await assertFails(batch.commit());
  });

  it("blocks renaming without reserving the new username", async () => {
    await seed({ [`users/${ALICE}`]: profile(ALICE, "Alice"), "usernames/alice": { uid: ALICE } });

    await assertFails(updateDoc(doc(as(ALICE), "users", ALICE), { username: "Alicia", usernameLower: "alicia" }));
  });

  it("lets a legacy profile without a reservation save settings and reserve its name (updateUserProfile)", async () => {
    await seed({ [`users/${ALICE}`]: profile(ALICE, "Alice") });
    const db = as(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, "usernames", "alice"), { uid: ALICE });
    batch.set(doc(db, "users", ALICE), { username: "Alice", darkMode: false }, { merge: true });

    await assertSucceeds(batch.commit());
  });

  it("lets a user update theme, language and Spooler settings (ShellLayout, updateStartupWaste)", async () => {
    const db = as(BOB);

    await assertSucceeds(updateDoc(doc(db, "users", BOB), { darkMode: false }));
    await assertSucceeds(updateDoc(doc(db, "users", BOB), { language: "en" }));
    await assertSucceeds(updateDoc(doc(db, "users", BOB), { startupWaste: 2 }));
  });

  it("blocks writing someone else's profile", async () => {
    await assertFails(updateDoc(doc(as(ALICE), "users", BOB), { username: "Hacked" }));
    await assertFails(setDoc(doc(as(ALICE), "users", BOB), profile(BOB, "Hacked")));
  });

  it("allows the username prefix search (searchUsers, searchParticipants)", async () => {
    const q = query(
      collection(as(ALICE), "users"),
      where("usernameLower", ">=", "bo"),
      where("usernameLower", "<=", "bo"),
      limit(20),
    );

    await assertSucceeds(getDocs(q));
  });

  it("allows fetching profiles by id (getEventParticipantsProfiles)", async () => {
    await assertSucceeds(getDocs(query(collection(as(ALICE), "users"), where(documentId(), "in", [BOB]))));
  });

  it("blocks private or unknown fields in profiles (email stays in Firebase Auth)", async () => {
    const db = as(ALICE);

    await assertFails(setDoc(doc(db, "users", ALICE), { ...profile(ALICE, "Alice"), email: "alice@example.com" }));
    await assertFails(updateDoc(doc(as(BOB), "users", BOB), { email: "bob@example.com" }));
    await assertFails(updateDoc(doc(as(BOB), "users", BOB), { isAdmin: true }));
  });

  it("lets a legacy profile drop its email (loadProfile) and blocks other writes until it does", async () => {
    await seed({ [`users/${ALICE}`]: { ...profile(ALICE, "Alice"), email: "alice@example.com" } });
    const db = as(ALICE);

    await assertFails(updateDoc(doc(db, "users", ALICE), { darkMode: false }));
    await assertSucceeds(updateDoc(doc(db, "users", ALICE), { email: deleteField() }));
    await assertSucceeds(updateDoc(doc(db, "users", ALICE), { darkMode: false }));
  });
});

describe("usernames/{usernameLower}", () => {
  it("lets anyone check availability without signing in", async () => {
    await seed({ "usernames/bob": { uid: BOB } });

    await assertSucceeds(getDoc(doc(anonymous(), "usernames", "bob")));
  });

  it("accepts the sign-up batch: profile + reservation (signUpWithEmailUser)", async () => {
    const db = as(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, "users", ALICE), profile(ALICE, "Alice"));
    batch.set(doc(db, "usernames", "alice"), { uid: ALICE });

    await assertSucceeds(batch.commit());
  });

  it("accepts the username-change batch (updateUserProfile)", async () => {
    await seed({ [`users/${ALICE}`]: profile(ALICE, "Alice"), "usernames/alice": { uid: ALICE } });
    const db = as(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, "usernames", "alicia"), { uid: ALICE });
    batch.delete(doc(db, "usernames", "alice"));
    batch.set(doc(db, "users", ALICE), { username: "Alicia", usernameLower: "alicia" }, { merge: true });

    await assertSucceeds(batch.commit());
  });

  it("blocks reserving a username for someone else", async () => {
    await assertFails(setDoc(doc(as(ALICE), "usernames", "bob"), { uid: BOB }));
  });

  it("blocks releasing the username the profile still points at", async () => {
    await seed({ [`users/${ALICE}`]: profile(ALICE, "Alice"), "usernames/alice": { uid: ALICE } });

    await assertFails(deleteDoc(doc(as(ALICE), "usernames", "alice")));
  });

  it("lets a user release a stale reservation of their own", async () => {
    await seed({ [`users/${ALICE}`]: profile(ALICE, "Alice"), "usernames/old-alice": { uid: ALICE } });

    await assertSucceeds(deleteDoc(doc(as(ALICE), "usernames", "old-alice")));
  });

  it("blocks releasing someone else's username", async () => {
    await seed({ "usernames/bob": { uid: BOB } });

    await assertFails(deleteDoc(doc(as(ALICE), "usernames", "bob")));
  });

  it("blocks taking over an existing reservation (setDoc on someone else's username)", async () => {
    await seed({ "usernames/bob": { uid: BOB } });

    await assertFails(setDoc(doc(as(ALICE), "usernames", "bob"), { uid: ALICE }));
  });

  it("blocks a second sign-up racing for the same username", async () => {
    await seed({ "usernames/bob": { uid: BOB } });
    const db = as(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, "users", ALICE), profile(ALICE, "Bob"));
    batch.set(doc(db, "usernames", "bob"), { uid: ALICE });

    await assertFails(batch.commit());
  });

  it("blocks reservations with extra fields", async () => {
    await assertFails(setDoc(doc(as(ALICE), "usernames", "alice"), { uid: ALICE, verified: true }));
  });
});
