Flaner is a personal planning app for friends and small groups: plan events and vote on dates, split shared expenses, keep shopping lists, manage friends and groups, and a few maker tools (3D-printer filament spooler). It is a mobile-first PWA used on phones as much as on desktops, in Polish and English, in a light and a dark theme. The UI is calm, dense enough for everyday lists, with one warm amber accent.

> Source of truth is the code: tokens in `packages/ui-components/src/theme/theme.css`, components in `@flaner/ui-components`. Design only with what this system lists; anything new (a token, a component) is a proposal, called out as such.

## Content fundamentals

- Every string exists in **Polish and English**; design with both lengths in mind (Polish runs ~20–30% longer). Never bake text into images.
- Address the user directly (“You have no friends yet.”, PL “Ty”). Short, plain verbs on buttons: “Accept”, “Decline”, “Invite”, “Remove”.
- English labels in use are Title Case for navigation, tabs and dialog titles (“My Friends”, “Find Friends”, “Friend Invitations”, “Danger Zone”) and sentence case for descriptions and messages (“Manage sent and received friend requests here.”).
- Destructive confirmations name the action and ask plainly: title “Remove Member”, body “Are you sure you want to remove this user from the group?”, confirm “Yes, remove”, cancel “Cancel”.
- Empty states state the fact and, where possible, offer the next action (“No sent invitations.” + an action button).
- Meta is lowercase and short: “added 07.11.2026”, “12 members”.
- No emoji in UI copy. No exclamation marks except success toasts.

## Visual foundations

### Colour
- Neutral first. Pages sit on `background` (warm off-white in light, near-black in dark); content sits on `card` (white / dark grey) or in `surface-subtle` sections. Text is `foreground`; secondary text is `muted-foreground`.
- **Brand amber** (`brand`, #edad5e) is the one accent. Use it as a fill for the primary call to action (`Button variant=brand`), active states, count badges and highlights — always with `brand-foreground` (ink) on it, never white. For amber text or icons on a neutral surface use `brand-text`. For a tinted background (icon tiles, selected row) use `brand-subtle`.
- Status colours carry meaning only: `success` (done / yes), `warning` (pending / maybe), `danger` (error / destructive / no), `info`. Each has a solid fill + `-foreground`, a `-subtle` tint with `-text` on it. Status is never colour alone: pair it with an icon or a word.
- `on-media` (white) and `scrim` (black) are fixed in both themes: text on photos / user-chosen colours, and modal backdrops (`scrim` at 40%).
- Data-viz uses `chart-1`…`chart-8` in order; balances use `chart-positive` / `chart-negative`.
- Domain sets (`vote-*`, `medal-*`, `event-*`) belong to their screens (planning, scheduler) only.
- Design every screen in **both themes**. Light mode separates surfaces by tone and borders (`border`), dark mode by lighter alpha fills (`surface-subtle` = white at 5%).

### Type
- One family: **Geist Variable** (`--font-sans`). Weights 400 / 500 / 600 / 700; 900 only for the page title.
- Default UI text is `text-sm` (14/20). Helper text `text-xs`; meta and badges `text-2xs`; counters `text-3xs`. `text-4xs` / `text-5xs` exist only for dense calendar grids.
- Page title: `page-title` — `text-2xl` on phones, `text-3xl` from `sm`, font-black, tight tracking. Section / card titles `text-lg` semibold. Dialog and sheet titles `text-base` medium.
- Numbers in counters and money use tabular figures.

### Spacing & layout
- Tailwind 4px scale (`space-4` = 16px). Page root: `max-w-screen-2xl mx-auto p-4 sm:p-6`, sections separated by `space-6` (`gap-4 sm:gap-6`). Narrow single-column views (Friends, Settings) use `max-w-4xl`.
- **Mobile-first**: design the 360–430px phone first, then `sm` / `md` (two-column grids), then `desktop` (1080px: side panels become columns). One layout that reflows — never a separate mobile screen.
- App shell: collapsible left sidebar (navigation per app, user menu with theme + language at the bottom); on phones it is an off-canvas sheet behind a menu button. Views render to the right of it.
- Touch targets ≥ 40px tall on phones (inputs `h-10`).

### Shape, elevation, motion
- Radius: inputs and buttons `radius-lg` (10px); list rows and icon tiles `radius-xl`; cards and empty states `radius-2xl`; sheets and dialogs `radius-3xl`; pills, avatars, count badges `radius-full`.
- Elevation is subtle: cards `shadow-raised`, popovers / hovered interactive cards `shadow-overlay`, dialogs `shadow-modal`. No coloured shadows except `shadow-glow-*` highlights.
- Borders are 1px `border`; inside subtle sections `border-subtle`. Dashed `border` = an empty drop / empty-state area.
- Motion is short: 150ms hovers and toggles, 200ms popovers and tabs, 300ms sheets and dialogs, `ease-standard`. Respect reduced motion. No decorative animation.

### States
- Hover: `surface-hover` on rows and ghost buttons; solid fills go to 90% (`hover:bg-brand/90`); interactive cards lift to `shadow-overlay` with a `brand` border at 40%.
- Focus: always visible, `ring-2` in `ring`.
- Disabled: 50% opacity, no pointer.
- Loading: `Skeleton` shapes the size of the content for data; a spinner inside the button for an action. Never a blank screen.
- Error: `Alert` for a block, `FieldError` under a field, toast for background failures.
- Empty: `EmptyState` (icon tile + title + one sentence + optional action).

## Components (`@flaner/ui-components`)

Use these before inventing anything. Names are the real component names.

| Need | Component | Notes |
|---|---|---|
| View title | `PageHeader` | `icon` in a `brand-subtle` tile, `title`, optional `description`, `actions` on the right, optional `back` link above |
| Panel / surface | `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`) | `variant` default / subtle / interactive; `padding` none / sm / md |
| Row in a list | `ListItem` | `leading` (avatar / icon), `title`, `description`, `trailing` actions; `variant` card / plain; `interactive` |
| Nothing to show | `EmptyState` | `icon`, `title`, `description`, `action`; `variant` plain / card |
| Loading | `Skeleton` | same size as the content |
| Status / counter | `Badge` | `variant` neutral / outline / brand / success / warning / danger / info / solid / solid-danger; `shape` pill / tag / count |
| Actions | `Button` | `variant` brand (main CTA) / primary / outline / secondary / ghost / destructive / link; `size` xs–xl, icon sizes; `isBusy` spinner |
| Sections of one view | `Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`) | segmented control look, full width on phones |
| Secondary panel / collection | `Sheet` | members, invitations, filters on mobile |
| Short focused task | `Dialog` | create, edit, settle up |
| Destructive confirm | `ConfirmationPopup` | `variant` destructive |
| Menus | `DropdownMenu`, `Popover`, `Tooltip` | |
| Person | `Avatar` | photo or initials on the brand gradient (`brand` → `brand-dark`) |
| Search | `SearchBar`, `IconTextField` | leading search icon, clear button |
| Forms | `TextField`, `TextArea`, `Select`, `DatePicker`, `MoneyInput`, `Switch`, `Checkbox`, `ColorPickerField`, `ImagePicker` (+ `Form*` variants bound to react-hook-form) | label above, helper / error below (`Field`, `FieldLabel`, `FieldError`) |
| Multi-step flow | `Stepper` | `steps`, `currentStep` |
| Chart frame | `ChartContainer` | title + legend in `chart-*` colours; chart inside |
| Calendar | `BigCalendar`, `Calendar` | planning only |
| Feedback | `Alert`, `Toaster` | |

## Patterns

- **Page**: `PageHeader` → (optional `Tabs`) → content. Primary action sits in `PageHeader` `actions` (a `brand` button) or as the `EmptyState` action when the list is empty.
- **List of people / items**: `ListItem` rows inside a `Card`, or a grid of row cards (`grid-cols-1 md:grid-cols-2 gap-4`); filter input above the list; row actions trailing (`outline` / `ghost` small buttons, icon + label).
- **Sheet vs. dialog**: `Sheet` (slides in from the right, 75% wide on phones, max 384px from `sm`) for browsing or managing a collection; `Dialog` for a short task that is completed or cancelled; `ConfirmationPopup` for anything destructive.
- **Forms**: one column on phones, label above field, helper text below, primary submit bottom-right (full width on phones), cancel as `ghost` / `outline`.
- **Counts**: a `Badge shape=count variant=solid` on the trigger (e.g. pending invitations on the Invitations button).

## Iconography

- **lucide** icons only (outline, default 2px stroke). Sizes: `size-4` inline and in buttons, `size-5` navigation, `size-6` in `PageHeader` / `EmptyState` tiles.
- Icons are `currentColor`: `muted-foreground` when decorative, `brand-text` in brand tiles, status `-text` colours for status.
- No emoji as icons, no illustrations, no stock photos. User avatars and group images are the only photos.

## Logo

- `assets/Logos/flaner-icon.png` — the PWA / home-screen icon (two connected nodes forming an “F”, blue → violet gradient). Use it only as the app icon. Its gradient is **not** a UI colour: never reuse blue / violet in components.
- Inside the app the mark is typographic: a `brand` square (`radius-md`, ~40px) with a font-black “F” in `brand-foreground`, followed by the wordmark “FLANER” in `text-2xl` font-black, wide tracking, `brand-text` (sidebar header).

## Don't

- Don't use raw colours, hex values or Tailwind palette colours (`amber-500`, `white/5`, `zinc-900`); only the tokens above.
- Don't put white text on `brand`; don't use `brand` for text on light backgrounds (use `brand-text`).
- Don't add new fonts, gradients (other than the avatar fallback), glassmorphism, coloured left-border cards or decorative illustrations.
- Don't design desktop-only layouts or separate mobile screens; don't use font sizes under `text-3xs` outside calendar grids.
- Don't invent components when one above fits; if nothing fits, mark the new element as a proposal.
