import { expect, test } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import { createUser, seedFriendship, seedProfile } from "../support/helpers/emulator";
import { FriendsPage } from "../support/pages/Friends.page";

// #26: friend lists read the friend's profile live, friendships hold no copy of it

test("a friend's new username shows up on the friends list without a reload", async ({ page }) => {
  const [user, friend] = await Promise.all([createUser(), createUser()]);
  await seedFriendship(user, friend);

  await signIn(page, user);
  const friends = new FriendsPage(page);
  await friends.goto();
  await expect(friends.friend(friend.username)).toBeVisible();

  const renamed = `${friend.username}-new`;
  await seedProfile({ ...friend, username: renamed });

  await expect(friends.friend(renamed)).toBeVisible();
});
