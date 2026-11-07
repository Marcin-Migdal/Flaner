import { expect, test } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import { createUser, seedDocument, type E2EUser } from "../support/helpers/emulator";

// #26: friend lists read the friend's profile live, friendships hold no copy of it

const befriend = async (a: E2EUser, b: E2EUser) => {
  // The app reads only the doc id and createdAt (userRef is not seedable through this helper)
  await seedDocument(`users/${a.uid}/friendships/${b.uid}`, { createdAt: Date.now() });
  await seedDocument(`users/${b.uid}/friendships/${a.uid}`, { createdAt: Date.now() });
};

test("a friend's new username shows up on the friends list without a reload", async ({ page }) => {
  const [user, friend] = await Promise.all([createUser(), createUser()]);
  await befriend(user, friend);

  await signIn(page, user);
  await page.goto("/community/friends");
  await expect(page.getByText(friend.username, { exact: true })).toBeVisible();

  const renamed = `${friend.username}-new`;
  const { email: _email, password: _password, ...profile } = friend;
  await seedDocument(`users/${friend.uid}`, { ...profile, username: renamed, usernameLower: renamed.toLowerCase() });

  await expect(page.getByText(renamed, { exact: true })).toBeVisible();
});
