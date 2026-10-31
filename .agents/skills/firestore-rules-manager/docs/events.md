# events/{eventId}

Scheduler events (MFE `planning`): the creator proposes date slots, participants vote, the creator finalizes a slot (and can reopen voting).

## Invariants
- **I1** Only the creator and participants read the event; the creator is always a participant.
- **I2** Only the creator edits the event (name, description, slots, participants), finalizes / reopens it and deletes it. ⚠️ G1
- **I3** Participants only vote (change `proposedDates[*].votes[me]`) and only while the event is not finalized. ⚠️ G1 G2
- **I4** `creatorId` never changes. ⚠️ G1

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `name` | string | ✓ | |
| `description` | string | ✓ | |
| `creatorId` | string | ✓ | |
| `participants` | string[] | ✓ | contains `creatorId` |
| `endDate` | string (YYYY-MM-DD) | – | voting deadline |
| `proposedDates` | Array<{ `id`?, `start`, `end`, `color`, `votes`?: map<uid, `'yes' \| 'maybe' \| 'no'`> }> | ✓ | votes live inside the slots |
| `isFinalized` | boolean | ✓ | `false` on create |
| `finalizedSlotIndex` | number | – | set when finalized |
| `createdAt`, `updatedAt` | number (ms) | ✓ | |

## Write flows
All endpoints: `packages/planning/src/api/events/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Create | `createSchedulerEvent` | set event, create `event_invitation` notification per other participant | ✅ batch |
| Edit (creator) | `updateSchedulerEvent` (`useUpdateEventMutation`) | update fields + `updatedAt` | – |
| Finalize (creator) | `updateSchedulerEvent` (`useFinalizeEventMutation`) | update `isFinalized: true`, `finalizedSlotIndex`, `updatedAt` | – |
| Reopen (creator) | `unfinalizeSchedulerEvent` | update `isFinalized: false`, delete `finalizedSlotIndex`, prune past slots; `event_reopened` notifications | ✅ batch |
| Vote | `voteSchedulerEventSlot`, `batchVoteUnvotedSlots` | update `proposedDates`, `updatedAt` | ✅ transaction |
| Delete (creator) | `deleteSchedulerEvent` | delete event | – |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `participants array-contains me` | `getUserSchedulerEvents`, `subscribeToUserSchedulerEvents` | read: participant |

## Access matrix
| Actor \ operation | read | create | vote (not finalized) | vote (finalized) | edit / finalize / reopen | delete |
| --- | --- | --- | --- | --- | --- | --- |
| non-participant | ❌ | ✅ (as creator) | ❌ | ❌ | ❌ | ❌ |
| participant | ✅ | – | ✅ | ❌ | ❌ ⚠️ G1 | ❌ |
| creator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Known gaps
- **G1** Before finalization a participant can update **any** field: take over `creatorId` (and then delete the event), change `participants`, finalize, rewrite slots.
- **G2** Votes live inside `proposedDates`, so a participant who may vote can also change other participants' votes. Fixing it requires moving votes to `events/{id}/votes/{uid}` (data model change).

## Rules
```rules
// ==========================================
// WYDARZENIA (EVENTS)
// ==========================================
match /events/{eventId} {
  allow read: if isAuthenticated() && (request.auth.uid in resource.data.participants || request.auth.uid == resource.data.creatorId);
  allow create: if isAuthenticated() && request.resource.data.creatorId == request.auth.uid && request.auth.uid in request.resource.data.participants;
  allow update: if isAuthenticated() && (
    resource.data.creatorId == request.auth.uid ||
    (resource.data.get('isFinalized', false) == false && request.auth.uid in resource.data.participants)
  );
  allow delete: if isAuthenticated() && resource.data.creatorId == request.auth.uid;
}
```

## Tests
- `firestore-tests/events/events.spec.ts` — create batch, query, vote, finalize / reopen, delete, outsider; G1–G2 as `todo`.
