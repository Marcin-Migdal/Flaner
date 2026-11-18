# Research: repeat rules for recurring transactions (#136)

Part of map #63 (Budget app: Transactions and Planner, MVP). Glossary: a **Recurring transaction** is a transaction that repeats on a regular interval and has a next due date (`GLOSSARY.md` → Budget).

## Question

A recurring transaction needs repeat rules richer than "monthly": weekly on chosen weekdays, monthly on a given day (and the last day), every N months, yearly on a date. How do calendar and budgeting apps model this, what subset covers these cases, how are next due dates computed, and how are short months and time zones handled? Recommend a model and whether to use a library.

## Recommendation

1. **Own small model, no new library.** Store the rule in Firestore as a structured, discriminated object (type below), not as an RRULE string. Compute occurrences with `date-fns` 4, which is already a root dependency (`package.json`: `"date-fns": "^4.4.0"`).
2. **Dates are calendar dates, stored as `YYYY-MM-DD` strings.** Never store a timestamp for a due date. This removes time-zone drift by construction.
3. **Day 29–31 clamps to the last day of a short month** ("31st" means "31st, or the last day if the month is shorter"); `day: "last"` is an explicit option too. Feb 29 yearly clamps to Feb 28 in non-leap years. This is the opposite of RFC 5545, which drops invalid dates, so it is a deliberate deviation.
4. **Every occurrence is computed from the start date** (`addMonths(start, k * interval)`), never by stepping from the previous occurrence, so a 31st rule does not decay to the 28th after February.
5. **End conditions:** none or an until date. "After N times" is offered in the UI but saved as the date of the N-th occurrence (plus the count, for display only), so the generator only knows one end condition.
6. **Store a denormalised `nextDueDate`** next to the rule so the list of upcoming recurring transactions is one Firestore query; recompute it on write.
7. Keep the shape close to RRULE (`interval`, `weekdays`, `until`) so a later export to iCalendar, or a switch to a library, is a mapping rather than a migration.

The rest of this document gives the evidence.

## How others model it

### RFC 5545 RRULE (iCalendar)

RRULE is the standard calendar apps use (RFC 5545 §3.3.10, [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc5545#section-3.3.10), mirrored at [icalendar.org](https://icalendar.org/iCalendar-RFC-5545/3-3-10-recurrence-rule.html)). The relevant parts:

- `FREQ` (required, `SECONDLY` … `YEARLY`) and `INTERVAL` (default 1; "every N months" is `FREQ=MONTHLY;INTERVAL=N`).
- `UNTIL` (inclusive) and `COUNT` are optional and "MUST NOT occur in the same recur"; with neither, the rule repeats forever. `DTSTART` counts as the first occurrence for `COUNT`.
- `UNTIL` must have the same value type as `DTSTART`; with a `DATE` (date-only) `DTSTART`, time parts (`BYHOUR` etc.) are not allowed. So iCalendar itself has a date-only mode, which is what a budget needs.
- `BYDAY` lists weekdays; with `WEEKLY` it may not carry a numeric prefix (`-1MO` style is only for `MONTHLY`/`YEARLY`).
- `BYMONTHDAY` accepts `1..31` and `-31..-1` (negative counts from the end of the month, so `-1` is the last day).
- **Invalid dates:** "Recurrence rules may generate recurrence instances with an invalid date (e.g., February 30) … Such recurrence instances MUST be ignored and MUST NOT be counted as part of the recurrence set." So `FREQ=MONTHLY;BYMONTHDAY=31` skips every month shorter than 31 days. Getting "31st or last day" in pure RRULE needs `BYMONTHDAY=28,29,30,31;BYSETPOS=-1` (`BYSETPOS` picks a position within each interval's set; the RFC's own example uses `BYSETPOS=-1` for "last work day of the month").

The four cases in the ticket map to this subset: `FREQ` ∈ {`WEEKLY`, `MONTHLY`, `YEARLY`}, `INTERVAL`, `BYDAY` (weekly only), `BYMONTHDAY` (incl. `-1`), `BYMONTH` (yearly), `UNTIL`/`COUNT`. Everything else (hourly/minutely frequencies, `BYWEEKNO`, `BYYEARDAY`, `EXRULE`, time zones) is unused.

### Budgeting apps

- **YNAB** exposes a fixed list of frequencies, not a rule language. Its public API enum is `never, daily, weekly, everyOtherWeek, twiceAMonth, every4Weeks, monthly, everyOtherMonth, every3Months, every4Months, twiceAYear, yearly, everyOtherYear`, and a scheduled transaction carries `date_first` and `date_next` as ISO dates (`format: date`) ([YNAB OpenAPI spec](https://api.ynab.com/papi/open_api_spec.yaml)). No chosen weekdays, no "last day" option. This shows that date-only dates plus a stored next date is enough for a budget; their enum is too narrow for the ticket's cases.
- **Actual Budget** (open source) stores a structured config, not an RRULE string: `start`, `frequency` (`daily|weekly|monthly|yearly`), `interval`, `patterns` (`{ type, value }`, e.g. day-of-month or weekday), `endMode` (`never | after_n_occurrences | on_date`), `endOccurrences`, `endDate`, `skipWeekend`, `weekendSolveMode` (`before|after`). It converts this to rules of the [`@rschedule/core`](https://www.npmjs.com/package/@rschedule/core) library (`recurConfigToRSchedule` in [`packages/loot-core/src/shared/schedules.ts`](https://github.com/actualbudget/actual/blob/master/packages/loot-core/src/shared/schedules.ts)). Dates are `YYYY-MM-DD` strings, compared as strings; it pins every generated occurrence to 12:00 (`byHourOfDay: [12]`) so a time-zone offset cannot push it to another day. "Last" in the day picker is stored as `-1` ([`RecurringSchedulePicker.tsx`](https://github.com/actualbudget/actual/blob/master/packages/desktop-client/src/components/select/RecurringSchedulePicker.tsx)). Weekend-shifting moves a weekend occurrence to Friday or Monday.

Actual's design is the closest precedent: a structured object in storage, a library only for expansion, date-only strings, and the noon trick as a guard against time-zone bugs.

## Libraries

| Library | Status | Notes |
|---|---|---|
| [`rrule`](https://github.com/jkbrzt/rrule) (rrule.js) | `2.8.1`, last publish 2023-11-10 (npm); one dependency (`tslib`); 687 KB unpacked | Full RFC implementation. Works in "floating" UTC: the README says returned "UTC" dates "are always meant to be interpreted as dates in your local timezone" and must be read with `getUTC*`. `tzid` support depends on `Intl`. Many open time-zone issues (e.g. #596 UNTIL miscalculated with TZID, #610 wrong date on TZ rollover, #611, #649), ~187 open issues. Inherits RFC's "skip Feb 30" rule. |
| [`@rschedule/core`](https://www.npmjs.com/package/@rschedule/core) | `1.5.0`, last publish 2023-02-03 (npm) | Used by Actual. Needs a date adapter. Not maintained since 2023. |
| `date-fns` | `4.4.0`, already installed | No recurrence engine, but has everything a small generator needs: `addMonths`, `addWeeks`, `getDay`, `getDaysInMonth`, `lastDayOfMonth`, `differenceInCalendarMonths`, `differenceInCalendarWeeks`, `format`, `parseISO`. |
| `Temporal.PlainDate` | Firefox 139 (May 2025), Chrome/Edge 144 (Jan 2026); not in stable Safari as of mid-2026 ([web.dev, Jan 2026](https://web.dev/blog/web-platform-01-2026), [MDN blog](https://developer.mozilla.org/blog/javascript-temporal-is-coming); Safari status from secondary sources, unverified) | The ideal type for a calendar date, but needs a polyfill for Safari, so not for the MVP. |

Neither recurrence library is actively maintained, rrule.js has a long list of time-zone bugs, and both follow RFC semantics for the 31st that we would have to work around. The generator for four rule kinds is a few dozen lines on top of `date-fns`. A library is not worth the dependency.

## Date-only semantics and time zones

- Store due dates and the rule's start/until as `YYYY-MM-DD` strings (same as Actual and YNAB). String comparison then equals date comparison, and Firestore range queries on `nextDueDate` work directly.
- In code, parse with `parseISO("2026-01-31")`, which gives local midnight, do calendar arithmetic only with calendar functions (`addMonths`, `addDays`, `getDay`), and format back with `format(d, "yyyy-MM-dd")`. Never use millisecond arithmetic (`+ 86_400_000`) and never `toISOString()` (it converts to UTC and can move the date back a day east of Greenwich).
- A rare edge: a few time zones have had DST changes at midnight, where local midnight does not exist. `date-fns` calendar functions still return the same calendar day, so formatting back to a date string is safe. Actual's noon pin is an extra guard; we can do the same by parsing as `${date}T12:00` if a bug appears.
- The rule has no time zone. "Due on the 10th" means the 10th of the user's calendar wherever they are, which is what a budget user expects.

## Short months

Verified locally with the installed `date-fns` 4.4.0:

```
addMonths(2026-01-31, 1) → 2026-02-28
addMonths(2026-01-31, 2) → 2026-03-31
```

`addMonths` clamps to the last day of the target month. Because every occurrence k is computed as `addMonths(start, k * interval)` from the start date, the 31st returns in March. Stepping from the previous occurrence (`addMonths(prev, 1)`) would give 28 Feb → 28 Mar → 28 Apr…, a drift bug.

For a stored day (rather than one derived from `start`), the rule is simply `min(day, getDaysInMonth(month))`; `"last"` is `getDaysInMonth(month)`. Yearly Feb 29 behaves the same way (Feb 28 in common years).

This is a deliberate deviation from RFC 5545 (which skips the month). For bills and salaries, skipping a month is never what the user means; Actual, banks' standing orders and most budget apps clamp. If we ever export to iCalendar, a clamped day maps to `BYMONTHDAY=28,29,30,31;BYSETPOS=-1` style rules.

## Proposed TypeScript type

```ts
/** Calendar date, "YYYY-MM-DD". Never a timestamp. */
type IsoDate = string;

/** 1 = Monday … 7 = Sunday (ISO 8601, matches date-fns getISODay). */
type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Day 1–31 clamps to the month's last day; "last" is always the last day. */
type MonthDay = number | "last";

type RepeatPattern =
  | { freq: "weekly"; interval: number; weekdays: IsoWeekday[] }
  | { freq: "monthly"; interval: number; day: MonthDay }
  | { freq: "yearly"; interval: number; month: number; day: MonthDay };

type RepeatEnd =
  | { type: "never" }
  | { type: "until"; date: IsoDate }
  /** UI "after N times": `date` is the N-th occurrence, computed on save; `count` is for display. */
  | { type: "count"; count: number; date: IsoDate };

type RepeatRule = RepeatPattern & {
  /** First possible occurrence; anchors the interval (week/month/year index 0). */
  start: IsoDate;
  end: RepeatEnd;
};
```

Notes on the shape:

- A discriminated union on `freq` means each kind only has the fields it uses, and the `firestore-rules-manager` schema check can validate it per kind. Firestore stores nested maps and plain arrays fine (no arrays of arrays here).
- `interval` defaults to 1 in the UI; "every N months" is `{ freq: "monthly", interval: N, day }`.
- `weekdays` is non-empty; "every two weeks on Monday and Thursday" is `{ freq: "weekly", interval: 2, weekdays: [1, 4] }`.
- The recurring transaction document stores the rule plus a denormalised `nextDueDate: IsoDate | null` (`null` when the rule has ended).
- Weekend shifting (Actual's `skipWeekend`) is left out until a ticket asks for it; it would be one optional field.

## Computing occurrences

One pure function covers both needs: `occurrencesBetween(rule, from, to): IsoDate[]` (inclusive range). `nextDueDate` is the first result of `occurrencesBetween(rule, today, end)`, or computed by scanning forward period by period.

Per kind, for each period inside `[from, to]`:

- **monthly:** for each month `m` in range with `k = differenceInCalendarMonths(m, start)`, `k >= 0` and `k % interval === 0`, the date is `day` clamped to `m` (`"last"` → `getDaysInMonth(m)`); keep it if it is `>= start`.
- **yearly:** same with years, `month` fixed.
- **weekly:** for each day `d` in range, keep it if `getISODay(d)` is in `weekdays`, `d >= start`, and `differenceInCalendarWeeks(d, start, { weekStartsOn: 1 }) % interval === 0`.
- Then drop dates after `end.date` (for `until` and `count`).

For the Planner's month view, call it with the first and last day of the month: at most 31 dates per rule are inspected, so even hundreds of rules are cheap on the client. No occurrences are stored; they are derived on read. Only real transactions (an occurrence the user confirmed or that was posted) are stored.

Because `count` is converted to an end date when saving, the generator never has to count past occurrences, which is the expensive and bug-prone part of RFC `COUNT` (it needs every occurrence from `start`). The cost is that editing the pattern later must recompute `end.date` from `count`; the save path does that.

## Risks and open points

- **Deviation from RFC on the 31st.** Intentional; document it in the glossary or an ADR when the feature lands so nobody "fixes" it towards RRULE.
- **Changing a rule mid-series.** Editing `start`/`interval` re-anchors future occurrences; past confirmed transactions are unaffected because they are stored separately. Whether an edit applies "from now on" (split the series) is a product decision for the spec, not settled here.
- **Week anchor.** Weekly intervals count weeks from the week containing `start`, with weeks starting on Monday (Polish/ISO convention). A user who expects Sunday-based weeks would only see a difference with `interval > 1`.
- **Temporal later.** When Safari ships `Temporal`, `PlainDate` can replace the `date-fns` calls without changing the stored shape.
- Unverified: rrule.js minified/gzipped bundle size (only the npm unpacked size was checked), and Safari's exact Temporal status.

## Sources

- RFC 5545 §3.3.10 Recurrence Rule: https://www.rfc-editor.org/rfc/rfc5545#section-3.3.10 and https://icalendar.org/iCalendar-RFC-5545/3-3-10-recurrence-rule.html
- rrule.js README and issues: https://github.com/jkbrzt/rrule, https://github.com/jkbrzt/rrule/issues?q=is%3Aissue+timezone; npm metadata via `npm view rrule`
- `@rschedule/core` npm metadata: https://registry.npmjs.org/@rschedule/core
- Actual Budget: https://github.com/actualbudget/actual/blob/master/packages/loot-core/src/shared/schedules.ts, https://github.com/actualbudget/actual/blob/master/packages/desktop-client/src/components/select/RecurringSchedulePicker.tsx
- YNAB API spec: https://api.ynab.com/papi/open_api_spec.yaml
- Temporal support: https://web.dev/blog/web-platform-01-2026, https://developer.mozilla.org/blog/javascript-temporal-is-coming
- `date-fns` clamping: checked locally against the installed `date-fns` 4.4.0
