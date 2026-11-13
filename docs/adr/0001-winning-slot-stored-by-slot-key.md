# 0001. The winning slot is stored by its slot key, and a finalized event is settled

- Status: accepted
- Date: 2026-11-13
- Issue: #89

## Context
A Scheduler event identified a slot in two ways: votes used the slot key (`{start}_{end}`), while the winning slot was stored as an array index (`finalizedSlotIndex`). Every edit of the slots had to move that index; the rule lived in `EventModal`. Removing the winning slot kept the old index, so a finalized event showed another slot as its date, or (index out of range) no date and no way to reopen it.

## Decision
1. The winning slot is stored as `finalizedSlotKey`, the same slot key the votes use. Sorting or adding slots never moves it.
2. A finalized event is settled: only its name and description can change. Changing slots, participants or the deadline means reopening first. The endpoint (`updateSchedulerEvent`) and the security rules both enforce it, so the winning slot can never disappear.
3. The events module owns the lifecycle: `updateSchedulerEvent`, `finalizeSchedulerEvent` (checks the slot exists) and `unfinalizeSchedulerEvent`. Components only call them.
4. When slots are removed (an edit of an open event, or reopen dropping past slots), only the votes of those slots are deleted; all other votes stay.

## Consequences
- No index sync code; components compare slot keys (`getSlotKey`, `getWinningSlot`).
- No data migration: there were no stored Scheduler events to convert (the data was wiped before this shipped).
- Rules: finalized events accept only `name` / `description` changes or a reopen that drops slots (`proposedDates.hasAll`). Spec: `.agents/skills/firestore-rules-manager/docs/events.md` (I5).
