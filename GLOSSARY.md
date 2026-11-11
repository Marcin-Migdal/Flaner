# Flaner

Flaner is a personal organiser for friends and small groups. It covers the social graph (friends, groups), planning (Scheduler events, split groups) and tools (the Spooler). It is one context; the micro-frontends are a delivery split, not separate domains.

## People

**User**:
A person with a Flaner account, identified by a stable id.
_Avoid_: account, member (outside a group)

**Profile**:
The public face of a user that other users can see: username and avatar.
_Avoid_: user document, settings

**Username**:
A user's unique, case-insensitive handle, shown everywhere instead of a real name.
_Avoid_: name, display name, nickname

**Preferences**:
A user's private app choices: language and dark mode.
_Avoid_: settings (Settings is the screen where preferences and the profile are edited)

**Unverified email**:
An account whose email address has not been confirmed yet; it cannot use the app until it is.

## Friends

**Friend**:
A user with whom you share a mutual friendship.

**Friendship**:
The mutual link between two friends; it exists for both of them or for neither.

**Friend request**:
An offer of friendship from one user to another, waiting to be accepted or rejected. From your side it is either **outgoing** (you sent it) or **incoming** (you received it).
_Avoid_: invitation (that word is reserved for groups)

**Relationship status**:
How you relate to another user: none, friend, outgoing request, incoming request, or yourself.

## Groups

**Group**:
A named circle of users that can be invited to things together. A group is **public** (others can find it and ask to join) or **private** (members only).
_Avoid_: community, team; never use "group" alone for a split group

**Member**:
A user who belongs to a group, holding exactly one role in it.
_Avoid_: participant (that word is for events and split groups)

**Role**:
A member's rank in a group: owner, admin, moderator or member. Each group has exactly one owner.

**Role priority**:
The order of roles (owner > admin > moderator > member). You can only manage members, and assign roles, below your own.

**Permission**:
Something a role may do in a group: edit the group, manage members, manage join requests, invite members. The owner has every permission; the others' permissions can be changed per group.

**Requires approval**:
A group setting: joining needs a join request accepted by someone with permission, instead of joining directly.

**Group invitation**:
An offer from a member to another user to join the group, waiting to be accepted or rejected.
_Avoid_: request

**Join request**:
A user's request to join a group that requires approval, waiting for a member with permission to accept or reject it.
_Avoid_: group request, request (alone)

**Accept / Reject**:
The two answers to a friend request, a group invitation or a join request.
_Avoid_: decline, answer, resolve

**Ownership transfer**:
The owner hands ownership to another member and becomes an admin.

## Notifications

**Notification**:
A message in a user's inbox about something another user did that concerns them (a request, an invitation, an event change, a settlement).

**Sender**:
The user whose action caused a notification.

**Source notification**:
A notification tied to an open request or invitation; it disappears when that request or invitation is accepted or rejected.

## Scheduler

**Scheduler**:
The planning tool for finding a date that suits everyone.

**Event**:
A plan made in the Scheduler: a name, its creator, its participants and the proposed slots they vote on.
_Avoid_: scheduler event (in prose), poll, meeting

**Participant**:
A user taking part in an event or a split group. A group can be added as participants, which adds its members.
_Avoid_: member (that word is for groups), attendee

**Slot**:
One proposed date or date range for an event.
_Avoid_: proposed date, option, date

**Vote**:
A participant's answer for one slot: yes, maybe or no.
_Avoid_: response, availability (the grid of all votes is the **availability grid**)

**Score**:
A slot's rating computed from its votes, used to rank slots from best to worst.
_Avoid_: points, match (the match percentage is the share of participants who can make it)

**Finalize**:
The event creator picks one slot as the event's date; voting stops.

**Winning slot**:
The slot picked when an event is finalized. It is chosen by the creator and is not necessarily the top-ranked slot.
_Avoid_: winner, finalized date, top-voted slot

**Reopen**:
Undoing a finalize so that voting continues.
_Avoid_: unfinalize

## Splits

**Split group**:
A shared ledger in which participants record who paid what and who owes whom.
_Avoid_: group (alone), split, expense group

**Former participant**:
Someone who left a split group but still appears in its history.

**Expense**:
A payment made by one participant on behalf of some or all participants of a split group.

**Payer**:
The participant who paid an expense, or who pays a settlement.
_Avoid_: paid by, sender

**Share**:
The part of an expense that one participant owes, split either **equally** or by **exact** amounts.
_Avoid_: split (for this meaning)

**Settlement**:
A repayment from one participant (payer) to another (**receiver**). It is **pending** until the receiver confirms it, then **confirmed**; only confirmed settlements change balances.
_Avoid_: payment, repayment, transfer

**Balance**:
How much a participant is owed (positive) or owes (negative) in one currency within a split group.

**Debt**:
An amount one participant owes another. Debts are shown **pairwise** (exactly between each pair) or **simplified** (the fewest transfers that settle everyone).

**Settled**:
A split group in which nobody owes anybody.

**Currency conversion**:
Changing a split group's currency, recalculating all amounts at historical exchange rates while keeping the originals.

## Spooler

**Spooler**:
The tool for tracking 3D-printer filament spools and how much of each is left. It is the only tool in the Tools area.
_Avoid_: tools (when you mean the Spooler)

**Spool**:
One physical roll of filament, with its starting weight and the weight left.
_Avoid_: roll, reel

**Finished spool**:
A spool with nothing left, or one the user marked as finished.
_Avoid_: empty spool

**Template**:
A reusable filament description (material, filament type, colour, default weight) from which spools are created.
_Avoid_: filament template (in prose), preset

**Print**:
One recorded print job and the filament it used on a spool.
_Avoid_: consumption, usage record

**Usage**:
The grams of filament a print took: the model's weight plus the startup waste.
_Avoid_: consumption

**Startup waste**:
Grams of filament lost at the start of every print (purge and prime), set once per user.
_Avoid_: start waste

**Carryover**:
The part of a print's usage that did not fit on a spool that ran out, moved onto its replacement spool.

**Clone**:
Creating a new spool from a finished one, with the same filament.

**Material / Filament type / Colour**:
The three levels that describe a filament, e.g. PLA / Basic / Jade White.
_Avoid_: type (alone, in prose)

**Filament catalog**:
The built-in list of known materials, filament types and colours.

**Custom (material, filament type, colour)**:
An entry the user added because it is not in the filament catalog.
_Avoid_: lookup (in prose; it is the storage word)
