import { expect, test, type Browser, type Page } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import { createUser, seedGroup, seedGroupInvitation, type E2EUser } from "../support/helpers/emulator";
import { CommunityPage } from "../support/pages/Community.page";
import { GroupDetailsPage } from "../support/pages/GroupDetails.page";

// Each scenario needs two real users in separate browser contexts (separate auth sessions)
const openSessionAs = async (browser: Browser, user: E2EUser): Promise<Page> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, user);
  return page;
};

const openGroupInvitations = async (page: Page) => {
  await new CommunityPage(page).goto();
  await page.getByRole("button", { name: /^group invitations$/i }).click();
};

test.describe("Group membership flows", () => {
  let owner: E2EUser;
  let other: E2EUser;

  test.beforeEach(async () => {
    [owner, other] = await Promise.all([createUser(), createUser()]);
  });

  test("owner creates a private group, invites a user and the invitee accepts", async ({ page, browser }) => {
    const groupName = `Private ${owner.username}`;
    await signIn(page, owner);

    const community = new CommunityPage(page);
    await community.goto();
    await community.openCreateModal();
    await community.fillGroupForm(groupName);
    await community.submitGroupForm();
    await page.getByText(groupName).click();

    const ownerView = new GroupDetailsPage(page);
    await ownerView.inviteUser(other.username);

    const inviteePage = await openSessionAs(browser, other);
    await openGroupInvitations(inviteePage);
    const invitations = inviteePage.getByRole("dialog");
    await expect(invitations.getByText(groupName)).toBeVisible();
    await invitations.getByRole("button", { name: /^accept$/i }).click();
    await expect(invitations.getByText(groupName)).not.toBeVisible();

    await inviteePage.getByText(groupName).click();
    const inviteeView = new GroupDetailsPage(inviteePage);
    await expect(inviteeView.membersHeading).toBeVisible();
    await expect(inviteeView.member(owner.username)).toBeVisible();

    await page.reload();
    await expect(ownerView.member(other.username)).toBeVisible();
  });

  test("invitee rejects an invitation and does not join the group", async ({ page, browser }) => {
    const group = await seedGroup(owner, { type: "private", requiresApproval: false });
    await seedGroupInvitation(group, other, owner);

    const inviteePage = await openSessionAs(browser, other);
    await openGroupInvitations(inviteePage);
    await inviteePage.getByRole("dialog").getByRole("button", { name: /^reject$/i }).click();
    // The invitations button disappears once there is nothing left to answer
    await expect(inviteePage.getByRole("button", { name: /^group invitations$/i })).toHaveCount(0);

    await signIn(page, owner);
    const ownerView = new GroupDetailsPage(page);
    await ownerView.goto(group.id);
    await expect(ownerView.member(owner.username)).toBeVisible();
    await expect(ownerView.member(other.username)).toHaveCount(0);
  });

  test("user sends a join request to a public group that requires approval", async ({ page, browser }) => {
    const group = await seedGroup(owner, { type: "public", requiresApproval: true });

    const requesterPage = await openSessionAs(browser, other);
    const requesterView = new GroupDetailsPage(requesterPage);
    await requesterView.goto(group.id);
    await requesterView.requestToJoinButton.click();
    await expect(requesterView.requestPendingButton).toBeVisible();
    await requesterPage.reload();
    await expect(requesterView.requestPendingButton).toBeVisible();
    await expect(requesterView.membersHeading).toHaveCount(0);

    await signIn(page, owner);
    const ownerView = new GroupDetailsPage(page);
    await ownerView.goto(group.id);
    await ownerView.requestsButton.click();
    await expect(ownerView.dialog.getByText(other.username)).toBeVisible();
  });

  test("owner approves a join request and the requester becomes a member", async ({ page, browser }) => {
    const group = await seedGroup(owner, { type: "public", requiresApproval: true });

    const requesterPage = await openSessionAs(browser, other);
    const requesterView = new GroupDetailsPage(requesterPage);
    await requesterView.goto(group.id);
    await requesterView.requestToJoinButton.click();
    await expect(requesterView.requestPendingButton).toBeVisible();

    await signIn(page, owner);
    const ownerView = new GroupDetailsPage(page);
    await ownerView.goto(group.id);
    await ownerView.acceptRequest();
    await page.keyboard.press("Escape");
    await expect(ownerView.member(other.username)).toBeVisible();

    await requesterPage.reload();
    await expect(requesterView.membersHeading).toBeVisible();
  });

  test("owner declines a join request and the requester stays outside", async ({ page, browser }) => {
    const group = await seedGroup(owner, { type: "public", requiresApproval: true });

    const requesterPage = await openSessionAs(browser, other);
    const requesterView = new GroupDetailsPage(requesterPage);
    await requesterView.goto(group.id);
    await requesterView.requestToJoinButton.click();
    await expect(requesterView.requestPendingButton).toBeVisible();

    await signIn(page, owner);
    const ownerView = new GroupDetailsPage(page);
    await ownerView.goto(group.id);
    await ownerView.declineRequest();
    await expect(ownerView.dialog.getByText(other.username)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(ownerView.member(other.username)).toHaveCount(0);

    await requesterPage.reload();
    await expect(requesterView.requestToJoinButton).toBeVisible();
    await expect(requesterView.membersHeading).toHaveCount(0);
  });

  test("user joins a public group without approval immediately", async ({ page }) => {
    const group = await seedGroup(owner, { type: "public", requiresApproval: false });

    await signIn(page, other);
    const view = new GroupDetailsPage(page);
    await view.goto(group.id);
    await view.joinButton.click();

    await expect(view.membersHeading).toBeVisible();
    await expect(view.member(other.username)).toBeVisible();
    await expect(view.member(owner.username)).toBeVisible();
  });
});
