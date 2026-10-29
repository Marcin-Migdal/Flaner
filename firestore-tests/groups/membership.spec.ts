import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
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

    it("lets the invitee clean up both invitation docs after joining", async () => {
      await seedGroup({ type: "private", requiresApproval: true }, INVITEE);
      const db = env.authenticatedContext(INVITEE).firestore();

      await assertSucceeds(joinAs(INVITEE));
      await assertSucceeds(deleteDoc(doc(db, `groups/${GROUP_ID}/invitations`, INVITEE)));
      await assertSucceeds(deleteDoc(doc(db, `users/${INVITEE}/groupInvitations`, GROUP_ID)));
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

  describe("by group staff (acceptJoinRequest)", () => {
    it("lets an admin add a requesting user", async () => {
      await seedGroup({ type: "public", requiresApproval: true });
      const db = env.authenticatedContext(ADMIN).firestore();

      await assertSucceeds(
        setDoc(doc(db, `groups/${GROUP_ID}/members`, STRANGER), { userId: STRANGER, role: "member", joinedAt: 1 }),
      );
    });
  });
});
