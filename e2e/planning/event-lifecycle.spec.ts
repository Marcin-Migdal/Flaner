import { expect, test } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import { createUser, readDocumentFields, seedDocument } from "../support/helpers/emulator";
import { PlanningPage } from "../support/pages/Planning.page";

// #89: the winning slot is stored by its slot key; a finalized event takes only a new name / description; reopen keeps the votes

// The edit button outside the event menu is shown below the `md` breakpoint
test.use({ viewport: { width: 390, height: 844 } });

const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

test("the creator finalizes the top slot, renames the finalized event and reopens voting without losing votes", async ({ page }) => {
  const [creator, participant] = await Promise.all([createUser(), createUser()]);
  const [first, second] = [isoDay(1), isoDay(2)];
  const [firstKey, secondKey] = [`${first}_${first}`, `${second}_${second}`];
  const eventId = `ev-${Date.now().toString(36)}`;
  await seedDocument(`events/${eventId}`, {
    id: eventId,
    name: "E2E lifecycle",
    description: "",
    creatorId: creator.uid,
    participants: [creator.uid, participant.uid],
    proposedDates: [
      { start: first, end: first, color: "blue" },
      { start: second, end: second, color: "teal" },
    ],
    // The second slot is the top pick
    votes: {
      [creator.uid]: { [firstKey]: "no", [secondKey]: "yes" },
      [participant.uid]: { [firstKey]: "maybe", [secondKey]: "yes" },
    },
    isFinalized: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const stored = async () => JSON.stringify(await readDocumentFields(`events/${eventId}`));

  await signIn(page, creator);
  await new PlanningPage(page).gotoScheduler();

  // Finalize: the modal preselects the top pick
  await page.getByRole("button", { name: /finalize event date/i }).click();
  await page.getByRole("button", { name: /confirm this date/i }).click();
  await expect.poll(stored).toContain(`"finalizedSlotKey":{"stringValue":"${secondKey}"}`);
  await expect(page.getByText("Date Confirmed")).toBeVisible();

  // A finalized event: only name and description
  await page.getByRole("button", { name: /^edit$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/only its name and description can be changed/i)).toBeVisible();
  await expect(dialog.getByText(/deadline for dates selection/i)).toHaveCount(0);
  await dialog.getByLabel(/event name/i).fill("E2E renamed");
  await dialog.getByRole("button", { name: /^save$/i }).click();
  await expect.poll(stored).toContain(`"name":{"stringValue":"E2E renamed"}`);
  expect(await stored()).toContain(`"finalizedSlotKey":{"stringValue":"${secondKey}"}`);

  // Reopen: voting continues with every vote kept
  await page.getByRole("button", { name: /reopen voting/i }).click();
  await page.getByRole("dialog").getByRole("button", { name: /reopen voting/i }).click();
  await expect.poll(stored).toContain(`"isFinalized":{"booleanValue":false}`);
  const reopened = await stored();
  expect(reopened).not.toContain("finalizedSlotKey");
  expect(reopened).toContain(`"${firstKey}":{"stringValue":"maybe"}`);
  expect(reopened).toContain(`"${secondKey}":{"stringValue":"yes"}`);
});
