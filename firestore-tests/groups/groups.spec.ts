import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
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

const OWNER = "owner-uid";
const ADMIN = "admin-uid";
const MODERATOR = "moderator-uid";
const MEMBER = "member-uid";
const INVITEE = "invitee-uid";
const REQUESTER = "requester-uid";
const STRANGER = "stranger-uid";
const GROUP_ID = "group-1";
const GROUP = `groups/${GROUP_ID}`;

const { as, seed } = useTestEnv();

const group = (overrides: Record<string, unknown> = {}) => ({
  id: GROUP_ID,
  name: "Test group",
  nameLower: "test group",
  description: "",
  type: "private",
  requiresApproval: true,
  ownerId: OWNER,
  avatarUrl: null,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const member = (userId: string, role: string) => ({ userId, role, joinedAt: 1 });

const invitation = (userId: string, invitedByUserId: string) => ({
  groupId: GROUP_ID,
  groupName: "Test group",
  groupAvatarUrl: null,
  userId,
  invitedByUserId,
  invitedAt: 1,
});

const seedGroup = (overrides: Record<string, unknown> = {}) =>
  seed({
    [GROUP]: group(overrides),
    [`${GROUP}/members/${OWNER}`]: member(OWNER, "owner"),
    [`${GROUP}/members/${ADMIN}`]: member(ADMIN, "admin"),
    [`${GROUP}/members/${MODERATOR}`]: member(MODERATOR, "moderator"),
    [`${GROUP}/members/${MEMBER}`]: member(MEMBER, "member"),
  });

describe("groups/{groupId}", () => {
  it("accepts createGroup: group doc, then the owner's member doc", async () => {
    const db = as(OWNER);

    await assertSucceeds(setDoc(doc(db, GROUP), group()));
    await assertSucceeds(setDoc(doc(db, `${GROUP}/members`, OWNER), member(OWNER, "owner")));
  });

  it("blocks creating a group owned by someone else", async () => {
    await assertFails(setDoc(doc(as(STRANGER), GROUP), group()));
  });

  it("shows private groups to members and invitees only", async () => {
    await seedGroup();
    await seed({ [`${GROUP}/invitations/${INVITEE}`]: invitation(INVITEE, OWNER) });

    await assertSucceeds(getDoc(doc(as(MEMBER), GROUP)));
    await assertSucceeds(getDoc(doc(as(INVITEE), GROUP)));
    await assertFails(getDoc(doc(as(STRANGER), GROUP)));
  });

  it("allows the public group search (searchGlobalGroups, searchParticipants)", async () => {
    await seedGroup({ type: "public" });
    const q = query(
      collection(as(STRANGER), "groups"),
      where("type", "==", "public"),
      where("nameLower", ">=", "test"),
      where("nameLower", "<=", "test"),
      limit(10),
    );

    await assertSucceeds(getDocs(q));
  });

  it("allows the collection-group membership and invitation queries for yourself", async () => {
    await seedGroup();
    await seed({ [`${GROUP}/invitations/${INVITEE}`]: invitation(INVITEE, OWNER) });

    await assertSucceeds(getDocs(query(collectionGroup(as(MEMBER), "members"), where("userId", "==", MEMBER))));
    await assertSucceeds(getDocs(query(collectionGroup(as(INVITEE), "invitations"), where("userId", "==", INVITEE))));
    await assertFails(getDocs(query(collectionGroup(as(STRANGER), "members"), where("userId", "==", MEMBER))));
  });

  it("lets the owner edit the group and its role permissions", async () => {
    await seedGroup();
    const db = as(OWNER);

    await assertSucceeds(updateDoc(doc(db, GROUP), { name: "Renamed", nameLower: "renamed", updatedAt: 2 }));
    await assertSucceeds(
      updateDoc(doc(db, GROUP), { rolePermissions: { admin: { editGroup: true } }, updatedAt: 3 }),
    );
  });

  it("lets editGroup holders edit fields but not role permissions", async () => {
    await seedGroup({ rolePermissions: { admin: { editGroup: true } } });
    const db = as(ADMIN);

    await assertSucceeds(updateDoc(doc(db, GROUP), { description: "New", updatedAt: 2 }));
    await assertFails(updateDoc(doc(db, GROUP), { rolePermissions: { member: { editGroup: true } } }));
  });

  it("blocks editing without editGroup", async () => {
    await seedGroup();

    await assertFails(updateDoc(doc(as(ADMIN), GROUP), { description: "New" }));
    await assertFails(updateDoc(doc(as(MEMBER), GROUP), { description: "New" }));
  });

  it("accepts the ownership transfer batch (transferGroupOwnership)", async () => {
    await seedGroup();
    const db = as(OWNER);
    const batch = writeBatch(db);
    batch.update(doc(db, GROUP), { ownerId: ADMIN, updatedAt: 2 });
    batch.update(doc(db, `${GROUP}/members`, OWNER), { role: "admin" });
    batch.update(doc(db, `${GROUP}/members`, ADMIN), { role: "owner" });

    await assertSucceeds(batch.commit());
  });

  it("accepts the delete batch for a group without pending invitations (deleteGroup)", async () => {
    await seedGroup();
    await seed({ [`${GROUP}/requests/${REQUESTER}`]: { userId: REQUESTER, requestedAt: 1 } });
    const db = as(OWNER);
    const batch = writeBatch(db);
    [OWNER, ADMIN, MODERATOR, MEMBER].forEach((uid) => batch.delete(doc(db, `${GROUP}/members`, uid)));
    batch.delete(doc(db, `${GROUP}/requests`, REQUESTER));
    batch.delete(doc(db, GROUP));

    await assertSucceeds(batch.commit());
  });

  it("lets only the owner delete the group", async () => {
    await seedGroup();

    await assertFails(deleteDoc(doc(as(ADMIN), GROUP)));
  });

  it.todo("G1: accepts deleteGroup when invitees still have users/{uid}/groupInvitations mirrors");
});

describe("groups/{groupId}/members/{userId}", () => {
  it("shows the member list to members only", async () => {
    await seedGroup();

    await assertSucceeds(getDocs(collection(as(MEMBER), `${GROUP}/members`)));
    await assertFails(getDocs(collection(as(STRANGER), `${GROUP}/members`)));
  });

  it("lets an admin change roles below their own", async () => {
    await seedGroup();
    const db = as(ADMIN);

    await assertSucceeds(updateDoc(doc(db, `${GROUP}/members`, MEMBER), { role: "moderator" }));
    await assertFails(updateDoc(doc(db, `${GROUP}/members`, MEMBER), { role: "admin" }));
    await assertFails(updateDoc(doc(db, `${GROUP}/members`, OWNER), { role: "member" }));
  });

  it("blocks role changes by members and moderators", async () => {
    await seedGroup();

    await assertFails(updateDoc(doc(as(MEMBER), `${GROUP}/members`, MEMBER), { role: "admin" }));
    await assertFails(updateDoc(doc(as(MODERATOR), `${GROUP}/members`, MEMBER), { role: "moderator" }));
  });

  it("lets members leave and admins remove lower roles", async () => {
    await seedGroup();

    await assertSucceeds(deleteDoc(doc(as(MEMBER), `${GROUP}/members`, MEMBER)));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), `${GROUP}/members`, MODERATOR)));
    await assertFails(deleteDoc(doc(as(ADMIN), `${GROUP}/members`, OWNER)));
    await assertFails(deleteDoc(doc(as(MODERATOR), `${GROUP}/members`, ADMIN)));
  });

  it.todo("G2: blocks self-join (public group or invitation) with a role other than member");
  it.todo("G3: blocks staff from creating members with the owner role");
  it.todo("G4: blocks the owner from leaving the group");
});

describe("groups/{groupId}/invitations/{userId}", () => {
  it("accepts inviteUserToGroup from a moderator: both invitation docs + notification", async () => {
    await seedGroup();
    const db = as(MODERATOR);

    await assertSucceeds(setDoc(doc(db, `${GROUP}/invitations`, INVITEE), invitation(INVITEE, MODERATOR)));
    await assertSucceeds(setDoc(doc(db, `users/${INVITEE}/groupInvitations`, GROUP_ID), invitation(INVITEE, MODERATOR)));
    const notifRef = doc(collection(db, `users/${INVITEE}/notifications`));
    await assertSucceeds(
      setDoc(notifRef, {
        id: notifRef.id,
        type: "group_invitation",
        senderUid: MODERATOR,
        senderUsername: "Moderator",
        senderAvatarUrl: "",
        createdAt: Date.now(),
        read: false,
      }),
    );
  });

  it("blocks invitations from members without inviteMembers", async () => {
    await seedGroup();
    const db = as(MEMBER);

    await assertFails(setDoc(doc(db, `${GROUP}/invitations`, INVITEE), invitation(INVITEE, MEMBER)));
    await assertFails(setDoc(doc(db, `users/${INVITEE}/groupInvitations`, GROUP_ID), invitation(INVITEE, MEMBER)));
  });

  it("lets the invitee read and reject the invitation (rejectGroupInvitation)", async () => {
    await seedGroup();
    await seed({
      [`${GROUP}/invitations/${INVITEE}`]: invitation(INVITEE, OWNER),
      [`users/${INVITEE}/groupInvitations/${GROUP_ID}`]: invitation(INVITEE, OWNER),
    });
    const db = as(INVITEE);

    await assertSucceeds(getDocs(collection(db, `users/${INVITEE}/groupInvitations`)));
    await assertSucceeds(deleteDoc(doc(db, `${GROUP}/invitations`, INVITEE)));
    await assertSucceeds(deleteDoc(doc(db, `users/${INVITEE}/groupInvitations`, GROUP_ID)));
  });

  it("lets members list the group's invitations and staff revoke the group-side doc", async () => {
    await seedGroup();
    await seed({ [`${GROUP}/invitations/${INVITEE}`]: invitation(INVITEE, OWNER) });

    await assertSucceeds(getDocs(collection(as(MEMBER), `${GROUP}/invitations`)));
    await assertFails(deleteDoc(doc(as(MEMBER), `${GROUP}/invitations`, INVITEE)));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), `${GROUP}/invitations`, INVITEE)));
  });

  it.todo("users.md G4: lets staff delete the invitee's groupInvitations mirror when revoking or deleting the group");
});

describe("groups/{groupId}/requests/{userId}", () => {
  it("lets a user request to join and read their own request", async () => {
    await seedGroup({ type: "public" });
    const db = as(REQUESTER);

    await assertSucceeds(setDoc(doc(db, `${GROUP}/requests`, REQUESTER), { userId: REQUESTER, requestedAt: 1 }));
    await assertSucceeds(getDoc(doc(db, `${GROUP}/requests`, REQUESTER)));
  });

  it("blocks requesting on behalf of someone else", async () => {
    await seedGroup({ type: "public" });

    await assertFails(setDoc(doc(as(STRANGER), `${GROUP}/requests`, REQUESTER), { userId: REQUESTER, requestedAt: 1 }));
  });

  it("lets admins list, accept and reject requests; hides them from members", async () => {
    await seedGroup({ type: "public" });
    await seed({ [`${GROUP}/requests/${REQUESTER}`]: { userId: REQUESTER, requestedAt: 1 } });
    const db = as(ADMIN);

    await assertFails(getDocs(collection(as(MEMBER), `${GROUP}/requests`)));
    await assertSucceeds(getDocs(collection(db, `${GROUP}/requests`)));
    await assertSucceeds(setDoc(doc(db, `${GROUP}/members`, REQUESTER), member(REQUESTER, "member")));
    await assertSucceeds(deleteDoc(doc(db, `${GROUP}/requests`, REQUESTER)));
  });
});
