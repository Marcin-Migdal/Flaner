import { expect, test } from "@playwright/test";
import type { SchedulerEvent } from "../../packages/planning/src/api/events/types";
import { signIn } from "../support/helpers/auth";
import { createUser, readDocument, seedEvent } from "../support/helpers/emulator";
import { SchedulerPage } from "../support/pages/Scheduler.page";

// #89: the winning slot is stored by its slot key; a finalized event takes only a new name / description; reopen keeps the votes

// The edit button outside the event menu is shown below the `md` breakpoint
test.use({ viewport: { width: 390, height: 844 } });

const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

test("the creator finalizes the top slot, renames the finalized event and reopens voting without losing votes", async ({ page }) => {
  const [creator, participant] = await Promise.all([createUser(), createUser()]);
  const [first, second] = [isoDay(1), isoDay(2)];
  const [firstKey, secondKey] = [`${first}_${first}`, `${second}_${second}`];
  const votes = {
    [creator.uid]: { [firstKey]: "no", [secondKey]: "yes" },
    [participant.uid]: { [firstKey]: "maybe", [secondKey]: "yes" },
  } satisfies SchedulerEvent["votes"];
  const event = await seedEvent(creator, {
    name: "E2E lifecycle",
    participants: [creator, participant],
    proposedDates: [
      { start: first, end: first, color: "blue" },
      { start: second, end: second, color: "teal" },
    ],
    // The second slot is the top pick
    votes,
  });
  const stored = () => readDocument(`events/${event.id}`);

  await signIn(page, creator);
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();

  // Finalize: the modal preselects the top pick
  await scheduler.finalizeTopSlot();
  await expect.poll(stored).toMatchObject({ isFinalized: true, finalizedSlotKey: secondKey } satisfies Partial<SchedulerEvent>);
  await expect(scheduler.dateConfirmed).toBeVisible();

  // A finalized event: only name and description
  await scheduler.openEdit();
  await expect(scheduler.finalizedEditNotice).toBeVisible();
  await expect(scheduler.deadlineField).toHaveCount(0);
  await scheduler.renameInEdit("E2E renamed");
  await expect
    .poll(stored)
    .toMatchObject({ name: "E2E renamed", finalizedSlotKey: secondKey } satisfies Partial<SchedulerEvent>);

  // Reopen: voting continues with every vote kept
  await scheduler.reopenVoting();
  await expect.poll(stored).toMatchObject({ isFinalized: false, votes } satisfies Partial<SchedulerEvent>);
  expect(await stored()).not.toHaveProperty("finalizedSlotKey");
});
