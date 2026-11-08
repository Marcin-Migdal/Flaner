import { expect, test } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import { createUser, readDocumentFields, seedDocument } from "../support/helpers/emulator";
import { PlanningPage } from "../support/pages/Planning.page";

// #33: votes live in a per-participant map on the event; a vote changes only the voter's own entry

test("a participant's votes are saved in their own entry, next to the creator's untouched vote", async ({ page }) => {
  const [creator, participant] = await Promise.all([createUser(), createUser()]);
  const day = new Date().toISOString().slice(0, 10); // today keeps the slot in the calendar's current month
  const slotKey = `${day}_${day}`;
  const eventId = `ev-${Date.now().toString(36)}`;
  await seedDocument(`events/${eventId}`, {
    id: eventId,
    name: "E2E vote",
    description: "",
    creatorId: creator.uid,
    participants: [creator.uid, participant.uid],
    proposedDates: [{ start: day, end: day, color: "blue" }],
    votes: { [creator.uid]: { [slotKey]: "yes" } },
    isFinalized: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await signIn(page, participant);
  await new PlanningPage(page).gotoScheduler();
  // The creator's vote is read back onto the slot
  await expect(page.getByText("Not voted")).toBeVisible();
  await page.getByRole("button", { name: /mark remaining \(1\) as no/i }).click();
  await page.getByRole("button", { name: /^mark as no$/i }).click();

  await expect
    .poll(async () => JSON.stringify((await readDocumentFields(`events/${eventId}`)).votes))
    .toContain(participant.uid);
  const votes = JSON.stringify((await readDocumentFields(`events/${eventId}`)).votes);
  // Raw REST shape: votes → { uid → { slotKey → vote } }
  const voteOf = (uid: string, vote: string) => new RegExp(`"${uid}":{"mapValue":{"fields":{"${slotKey}":{"stringValue":"${vote}"`);
  expect(votes).toMatch(voteOf(creator.uid, "yes"));
  expect(votes).toMatch(voteOf(participant.uid, "no"));
  await expect(page.getByText("Not voted")).toHaveCount(0);
});
