import { expect, test } from "@playwright/test";
import type { SchedulerEvent } from "../../packages/planning/src/api/events/types";
import { signIn } from "../support/helpers/auth";
import { createUser, readDocument, seedEvent } from "../support/helpers/emulator";
import { SchedulerPage } from "../support/pages/Scheduler.page";

// #33: votes live in a per-participant map on the event; a vote changes only the voter's own entry

test("a participant's votes are saved in their own entry, next to the creator's untouched vote", async ({ page }) => {
  const [creator, participant] = await Promise.all([createUser(), createUser()]);
  const day = new Date().toISOString().slice(0, 10); // today keeps the slot in the calendar's current month
  const slotKey = `${day}_${day}`;
  const event = await seedEvent(creator, {
    participants: [creator, participant],
    proposedDates: [{ start: day, end: day, color: "blue" }],
    votes: { [creator.uid]: { [slotKey]: "yes" } },
  });

  await signIn(page, participant);
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();
  // The creator's vote is read back onto the slot
  await expect(scheduler.notVoted).toBeVisible();
  await scheduler.markRemainingAsNo(1);

  await expect
    .poll(() => readDocument(`events/${event.id}`))
    .toMatchObject({
      votes: { [creator.uid]: { [slotKey]: "yes" }, [participant.uid]: { [slotKey]: "no" } },
    } satisfies Partial<SchedulerEvent>);
  await expect(scheduler.notVoted).toHaveCount(0);
});
