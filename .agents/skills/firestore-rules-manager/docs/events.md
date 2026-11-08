# events/{eventId}

Scheduler events (MFE `planning`): the creator proposes date slots, participants vote, the creator finalizes a slot (and can reopen voting).

## Invariants
- **I1** Only the creator and participants read the event; the creator is always a participant.
- **I1b** New events start open (`isFinalized: false`).
- **I2** Only the creator edits the event (name, description, slots, participants), finalizes / reopens it and deletes it.
- **I3** Participants only vote, i.e. change their own entry `votes[me]`, and only while the event is not finalized. Slots and other participants' votes stay untouched (#33).
- **I3b** A new event may carry only the creator's own votes (auto-vote on create).
- **I4** `creatorId` never changes.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `name` | string | ✓ | |
| `description` | string | ✓ | |
| `creatorId` | string | ✓ | |
| `participants` | string[] | ✓ | contains `creatorId` |
| `endDate` | string (YYYY-MM-DD) | – | voting deadline |
| `proposedDates` | Array<{ `start`, `end`, `color` }> | ✓ | a slot is identified by its dates (`{start}_{end}`); `color` is a palette key (`blue`, `teal`…, see `planning/src/utils/slotColors`), the light/dark colour lives in theme.css |
| `votes` | map<uid, map<slotKey, `'yes' \| 'maybe' \| 'no'`>> | – | slotKey = `{start}_{end}`; each participant writes only their own entry |
| `isFinalized` | boolean | ✓ | `false` on create |
| `finalizedSlotIndex` | number | – | set when finalized |
| `createdAt`, `updatedAt` | number (ms) | ✓ | |

## Write flows
All endpoints: `packages/planning/src/api/events/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Create | `createSchedulerEvent` | set event, create `event_invitation_{eventId}` notification per other participant | ✅ batch |
| Edit (creator) | `updateSchedulerEvent` (`useUpdateEventMutation`) | update fields + `updatedAt`; removed participants' unread `event_invitation_` / `event_reopened_{eventId}` notifications deleted | ✅ batch |
| Finalize (creator) | `updateSchedulerEvent` (`useFinalizeEventMutation`) | update `isFinalized: true`, `finalizedSlotIndex`, `updatedAt` | – |
| Reopen (creator) | `unfinalizeSchedulerEvent` | update `isFinalized: false`, delete `finalizedSlotIndex`, prune past slots; `event_reopened_{eventId}` notifications (overwrite the previous one, users.md N5) | ✅ batch |
| Vote | `voteSchedulerEventSlot`, `batchVoteUnvotedSlots` | update `votes.{me}` (field path), `updatedAt` | – (one field) |
| Delete (creator) | `deleteSchedulerEvent` | delete event + other participants' unread `event_invitation_` / `event_reopened_{eventId}` notifications | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `participants array-contains me` | `getUserSchedulerEvents`, `subscribeToUserSchedulerEvents` | read: participant |

## Access matrix
| Actor \ operation | read | create | vote (not finalized) | vote (finalized) | edit / finalize / reopen | delete |
| --- | --- | --- | --- | --- | --- | --- |
| non-participant | ❌ | ✅ (as creator) | ❌ | ❌ | ❌ | ❌ |
| participant | ✅ | – | ✅ | ❌ | ❌ | ❌ |
| creator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Known gaps
None.

## Rules
```rules
// ==========================================
// WYDARZENIA (EVENTS)
// ==========================================
match /events/{eventId} {
  allow read: if isAuthenticated() && (request.auth.uid in resource.data.participants || request.auth.uid == resource.data.creatorId);
  allow create: if isAuthenticated() &&
    request.resource.data.creatorId == request.auth.uid &&
    request.auth.uid in request.resource.data.participants &&
    request.resource.data.isFinalized == false &&
    request.resource.data.get('votes', {}).keys().hasOnly([request.auth.uid]);
  allow update: if isAuthenticated() && (
    (resource.data.creatorId == request.auth.uid &&
      request.resource.data.creatorId == resource.data.creatorId) ||
    // Participants vote: only their own entry in `votes` changes, while the event is open
    (resource.data.get('isFinalized', false) == false &&
      request.auth.uid in resource.data.participants &&
      onlyChanges(['votes', 'updatedAt']) &&
      request.resource.data.get('votes', {}).diff(resource.data.get('votes', {})).affectedKeys().hasOnly([request.auth.uid]))
  );
  allow delete: if isAuthenticated() && resource.data.creatorId == request.auth.uid;
}
```

## Tests
- `firestore-tests/events/events.spec.ts` — create batch (only own votes), query, vote, finalize / reopen, delete, outsider, participant edits / takeover denied, other participants' votes and slots denied.
