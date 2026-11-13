import { expect, test } from "@playwright/test";
import path from "node:path";
import { signIn } from "../support/helpers/auth";
import { createUser, seedFriendship } from "../support/helpers/emulator";
import { FriendsPage } from "../support/pages/Friends.page";

// Friends view (community) as reference for Claude Design (#62) — light/dark × phone/desktop.

const OUT = path.join(__dirname, "..", "..", ".design-system", "screens");
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const FRIENDS = ["anna.nowak", "jan.kowalski", "ola", "piotr.wisniewski", "kasia_m"];
const DAY = 24 * 60 * 60 * 1000;

for (const theme of ["light", "dark"] as const) {
  test(`friends — ${theme}`, async ({ page }) => {
    const user = await createUser({ username: "marta", darkMode: theme === "dark" });
    // Same names in both runs: only the `usernames/*` lookup doc is shared, and the view does not read it
    const friends = await Promise.all(FRIENDS.map((username) => createUser({ username })));
    await Promise.all(friends.map((friend, i) => seedFriendship(user, friend, Date.now() - (i + 1) * 9 * DAY)));

    await signIn(page, user);
    const friendsPage = new FriendsPage(page);
    await friendsPage.goto();
    await expect(friendsPage.friend(friends[0].username)).toBeVisible();

    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, `friends-${theme}-${name}.png`) });
    }
  });
}
