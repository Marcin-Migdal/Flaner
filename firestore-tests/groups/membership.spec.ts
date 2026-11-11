import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";
import { createTestEnv } from "../support/testEnv";

const OWNER = "owner-uid";
const ADMIN = "admin-uid";
const INVITEE = "invitee-uid";
const STRANGER = "stranger-uid";
const GROUP_ID = "group-1";

type GroupSeed = { type: "public" | "private"; requiresApproval: boolean };

let env: RulesTestEnvironment;

const seedGroup = async ({ type, requiresApproval }: GroupSeed, withInvitationFor?: string) => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "groups", GROUP_ID), {
      id: GROUP_ID,
      name: "Test group",
      nameLower: "test group",
      ownerId: OWNER,
      type,
      requiresApproval,
    });
    await setDoc(doc(db, `groups/${GROUP_ID}/members`, OWNER), { userId: OWNER, role: "owner", joinedAt: 1 });
    await setDoc(doc(db, `groups/${GROUP_ID}/members`, ADMIN), { userId: ADMIN, role: "admin", joinedAt: 1 });

    if (withInvitationFor) {
      const invitation = {
        groupId: GROUP_ID,
        groupName: "Test group",
        groupAvatarUrl: null,
        userId: withInvitationFor,
        invitedByUserId: OWNER,
        invitedAt: 1,
      };
      await setDoc(doc(db, `groups/${GROUP_ID}/invitations`, withInvitationFor), invitation);
      await setDoc(doc(db, `users/${withInvitationFor}/groupInvitations`, GROUP_ID), invitation);
    }
  });
};

const joinAs = (uid: string) =>
  setDoc(doc(env.authenticatedContext(uid).firestore(), `groups/${GROUP_ID}/members`, uid), {
    userId: uid,
    role: "member",
    joinedAt: Date.now(),
  });

beforeAll(async () => {
  env = await createTestEnv();
});

afterEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env.cleanup();
});

describe("groups/{groupId}/members — joining a group", () => {
  describe("via invitation (acceptGroupInvitation)", () => {
    it.each<GroupSeed>([
      { type: "private", requiresApproval: true },
      { type: "private", requiresApproval: false },
      { type: "public", requiresApproval: true },
      { type: "public", requiresApproval: false },
    ])("lets the invitee join a $type group (requiresApproval: $requiresApproval)", async (group) => {
      await seedGroup(group, INVITEE);

      await assertSucceeds(joinAs(INVITEE));
    });

    it("accepts the acceptGroupInvitation batch: join + delete both invitation docs", async () => {
      await seedGroup({ type: "private", requiresApproval: true }, INVITEE);
      const db = env.authenticatedContext(INVITEE).firestore();
      const batch = writeBatch(db);
      batch.set(doc(db, `groups/${GROUP_ID}/members`, INVITEE), { userId: INVITEE, role: "member", joinedAt: 1 });
      batch.delete(doc(db, `groups/${GROUP_ID}/invitations`, INVITEE));
      batch.delete(doc(db, `users/${INVITEE}/groupInvitations`, GROUP_ID));
      // group_invitation_accepted to the inviter
      const notifRef = doc(collection(db, `users/${OWNER}/notifications`));
      batch.set(notifRef, {
        id: notifRef.id,
        type: "group_invitation_accepted",
        senderUid: INVITEE,
        senderUsername: "Invitee",
        senderAvatarUrl: "",
        groupId: GROUP_ID,
        groupName: "Test group",
        createdAt: Date.now(),
        read: false,
      });

      await assertSucceeds(batch.commit());
    });

    it("does not let an invitee add someone else as a member", async () => {
      await seedGroup({ type: "private", requiresApproval: true }, INVITEE);
      const db = env.authenticatedContext(INVITEE).firestore();

      await assertFails(
        setDoc(doc(db, `groups/${GROUP_ID}/members`, STRANGER), { userId: STRANGER, role: "member", joinedAt: 1 }),
      );
    });
  });

  describe("without invitation", () => {
    it("lets anyone join a public group that does not require approval", async () => {
      await seedGroup({ type: "public", requiresApproval: false });

      await assertSucceeds(joinAs(STRANGER));
    });

    it("blocks joining a public group that requires approval", async () => {
      await seedGroup({ type: "public", requiresApproval: true });

      await assertFails(joinAs(STRANGER));
    });

    it("blocks joining a private group", async () => {
      await seedGroup({ type: "private", requiresApproval: false });

      await assertFails(joinAs(STRANGER));
    });

    it("blocks unauthenticated users", async () => {
      await seedGroup({ type: "public", requiresApproval: false });
      const db = env.unauthenticatedContext().firestore();

      await assertFails(
        setDoc(doc(db, `groups/${GROUP_ID}/members`, STRANGER), { userId: STRANGER, role: "member", joinedAt: 1 }),
      );
    });
  });

  describe("by accepting a join request (acceptJoinRequest)", () => {
    const MODERATOR = "moderator-uid";

    const seedJoinRequest = (rolePermissions?: Record<string, Record<string, boolean>>) =>
      env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, `groups/${GROUP_ID}/requests`, STRANGER), { userId: STRANGER, requestedAt: 1 });
        await setDoc(doc(db, `groups/${GROUP_ID}/members`, MODERATOR), {
          userId: MODERATOR,
          role: "moderator",
          joinedAt: 1,
        });
        if (rolePermissions) await setDoc(doc(db, "groups", GROUP_ID), { rolePermissions }, { merge: true });
      });

    const strangerAsMember = { userId: STRANGER, role: "member", joinedAt: 1 };

    const acceptAs = (uid: string) => {
      const db = env.authenticatedContext(uid).firestore();
      const batch = writeBatch(db);
      batch.set(doc(db, `groups/${GROUP_ID}/members`, STRANGER), strangerAsMember);
      batch.delete(doc(db, `groups/${GROUP_ID}/requests`, STRANGER));
      return batch.commit();
    };

    it("lets an admin with manageRequests accept a pending join request (member + request delete in one batch)", async () => {
      await seedGroup({ type: "public", requiresApproval: true });
      await seedJoinRequest();

      await assertSucceeds(acceptAs(ADMIN));
    });

    it("lets the owner accept a pending join request", async () => {
      await seedGroup({ type: "private", requiresApproval: false });
      await seedJoinRequest();

      await assertSucceeds(acceptAs(OWNER));
    });

    it("blocks adding a user without a pending join request", async () => {
      await seedGroup({ type: "private", requiresApproval: false });
      const db = env.authenticatedContext(OWNER).firestore();

      await assertFails(setDoc(doc(db, `groups/${GROUP_ID}/members`, STRANGER), strangerAsMember));
    });

    it("blocks adding a user while keeping their join request", async () => {
      await seedGroup({ type: "public", requiresApproval: true });
      await seedJoinRequest();
      const db = env.authenticatedContext(ADMIN).firestore();

      await assertFails(setDoc(doc(db, `groups/${GROUP_ID}/members`, STRANGER), strangerAsMember));
    });

    it("blocks an admin whose manageRequests was revoked", async () => {
      await seedGroup({ type: "public", requiresApproval: true });
      await seedJoinRequest({ admin: { manageRequests: false, manageMembers: true } });
      const db = env.authenticatedContext(ADMIN).firestore();

      // A bare create: the member create rule alone must deny it (the batch would also fail on the request delete)
      await assertFails(acceptAs(ADMIN));
      await assertFails(setDoc(doc(db, `groups/${GROUP_ID}/members`, STRANGER), strangerAsMember));
    });

    it("blocks a role with manageMembers but without manageRequests", async () => {
      await seedGroup({ type: "public", requiresApproval: true });
      await seedJoinRequest({ moderator: { manageMembers: true } });
      const db = env.authenticatedContext(MODERATOR).firestore();

      // A bare create: the member create rule alone must deny it (the batch would also fail on the request delete)
      await assertFails(acceptAs(MODERATOR));
      await assertFails(setDoc(doc(db, `groups/${GROUP_ID}/members`, STRANGER), strangerAsMember));
    });

    it("lets a moderator granted manageRequests accept", async () => {
      await seedGroup({ type: "public", requiresApproval: true });
      await seedJoinRequest({ moderator: { manageRequests: true } });

      await assertSucceeds(acceptAs(MODERATOR));
    });
  });
});
