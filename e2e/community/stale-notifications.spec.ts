import { expect, test, type Browser, type Page } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import {
  createUser,
  listDocumentIds,
  seedDocument,
  seedGroup,
  seedGroupInvitation,
  seedNotification,
  type E2EUser,
} from "../support/helpers/emulator";
import { CommunityPage } from "../support/pages/Community.page";
import { GroupDetailsPage } from "../support/pages/GroupDetails.page";

// #49: notifications about a source that got resolved disappear while unread; read ones stay.

const openSessionAs = async (browser: Browser, user: E2EUser): Promise<Page> => {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, user);
  return page;
};

const inboxOf = (user: E2EUser) => listDocumentIds(`users/${user.uid}/notifications`);

const deleteGroupAsOwner = async (page: Page, groupId: string) => {
  const view = new GroupDetailsPage(page);
  await view.goto(groupId);
  await page.getByRole("button", { name: /^manage$/i }).click();
  await view.dialog.getByRole("button", { name: /^delete group$/i }).click();
  await page.getByRole("button", { name: /^yes, delete group$/i }).click();
  await page.waitForURL(/\/community\/groups$/);
};

test.describe("Stale notifications (#49)", () => {
  let owner: E2EUser;
  let invitee: E2EUser;
  let other: E2EUser;

  test.beforeEach(async () => {
    [owner, invitee, other] = await Promise.all([createUser(), createUser(), createUser()]);
  });

  test("deleting a group removes invitees' unread invitation notifications, read ones stay", async ({ page }) => {
    const group = await seedGroup(owner, { type: "private", requiresApproval: false });
    const id = `group_invitation_${group.id}`;
    await seedGroupInvitation(group, invitee, owner);
    await seedGroupInvitation(group, other, owner);
    await seedNotification(invitee, id, { type: "group_invitation", sender: owner, groupId: group.id, groupName: group.name });
    await seedNotification(other, id, { type: "group_invitation", sender: owner, read: true, groupId: group.id, groupName: group.name });

    await signIn(page, owner);
    await deleteGroupAsOwner(page, group.id);

    await expect.poll(() => inboxOf(invitee)).not.toContain(id);
    expect(await inboxOf(other)).toContain(id);
  });

  test("rejecting an invitation removes the invitee's own unread invitation notification", async ({ page }) => {
    const group = await seedGroup(owner, { type: "private", requiresApproval: false });
    const id = `group_invitation_${group.id}`;
    await seedGroupInvitation(group, invitee, owner);
    await seedNotification(invitee, id, { type: "group_invitation", sender: owner, groupId: group.id, groupName: group.name });

    await signIn(page, invitee);
    await new CommunityPage(page).goto();
    await page.getByRole("button", { name: /^group invitations$/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^reject$/i }).click();

    await expect.poll(() => inboxOf(invitee)).not.toContain(id);
  });

  test("a member keeps only 'group deleted' from a deleted group's unread notifications", async ({ page, browser }) => {
    const group = await seedGroup(owner, { type: "private", requiresApproval: false });
    await seedDocument(`groups/${group.id}/members/${invitee.uid}`, { userId: invitee.uid, role: "member", joinedAt: Date.now() });
    await seedNotification(invitee, "request-accepted", {
      type: "group_request_accepted",
      sender: owner,
      groupId: group.id,
      groupName: group.name,
    });

    // The member's app is open: it cleans up its own inbox when "group_deleted" arrives
    await openSessionAs(browser, invitee);
    await signIn(page, owner);
    await deleteGroupAsOwner(page, group.id);

    await expect.poll(() => inboxOf(invitee)).not.toContain("request-accepted");
    expect(await inboxOf(invitee)).toHaveLength(1); // the group_deleted one
  });
});
