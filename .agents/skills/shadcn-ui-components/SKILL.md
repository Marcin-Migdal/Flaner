---
name: shadcn-ui-components
description: Standards for implementing shadcn/ui components correctly in this project. Make sure to use this skill whenever you are adding, editing, or reviewing any UI component, especially Input, Field, Button, Select, or any form element. Trigger this on any mention of "shadcn", "components", "form inputs", "field wrappers", "styling UI", or "fixing UI padding".
---

# Shadcn UI Components — Project Standards

This project uses shadcn/ui with a light and a dark theme driven by the semantic tokens in `packages/ui-components/src/theme/theme.css` (see `component-styling` §0 and `.agents/docs/design-system.md`). The default shadcn component output is often too compact or uses incorrect default sizes for this design. Always apply the corrections below when adding or modifying shadcn components, and replace any raw palette colour (`zinc-*`, `white`, `black`) the CLI generates with a semantic token.

---

## Design-system components (use before building your own)

| Need | Component (`@flaner/ui-components`) |
|---|---|
| Surface / panel | `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`); `variant` `default` / `subtle` / `interactive`, `padding` `none` / `sm` / `md` |
| View title | `PageHeader` (`title`, `description`, `icon`, `actions`, `back`, `as`) |
| Nothing to show | `EmptyState` (`icon`, `title`, `description`, `action`, `variant` `plain` / `card`) |
| Row in a list | `ListItem` (`leading`, `title`, `description`, `trailing`, `interactive`, `asChild`) |
| Person | `Avatar` (`name`, `src`, `variant` `brand` = initials on the brand gradient, `neutral`) — it computes the initials; never `getInitials` in an MFE, never a hand-made gradient on the fallback |
| Side panel | `SidePanel` (`title`, `description`) inside `Sheet` — never copy the `SheetContent` class string |
| Loading placeholder | `Skeleton` (same size as the content it replaces) |
| Status / counter | `Badge` (`variant` `neutral` / `outline` / `brand` / `success` / `warning` / `danger` / `info` / `solid` / `solid-danger`, `shape` `pill` / `tag` / `count`) |
| Multi-step flow | `Stepper` (`steps`, `currentStep`) |
| Chart frame + legend | `ChartContainer` (`title`, `legend` with `chart-*` colours; the chart renders in `children`) |

**Catalogue:** every component in `ui-components` has a `<Name>.stories.tsx` next to it (primitives: `components/ui/<name>.stories.tsx`; catalogue-level pages in `src/stories/`). Browse with `npm run storybook`; check both themes (toolbar) and the Accessibility panel before shipping a component. A new component is not done without its story.

Sheet vs. modal: `Sheet` + `SidePanel` for browsing/managing a collection or secondary context; `Dialog` for a short focused task; destructive confirmation = `ConfirmationPopup`.

---

## Input (`input.tsx`)

Shadcn CLI generates a compact input by default. **Always override** to the following sizing:

```tsx
// ✅ CORRECT — use in this project
"h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none ..."

// ❌ WRONG — shadcn default, do not keep
"h-8 ... px-2.5 py-1 text-base ..."
```

### Rules:
- **Height**: `h-10` (40px) — never `h-8` (32px)
- **Padding**: `px-3 py-2` — never `px-2.5 py-1`
- **Font size**: `text-sm` — never `text-base` on input
- **Ring**: `ring-2` — never `ring-3`

### Full correct className string:
```
h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40
```

---

## Field + FieldLabel + FieldError (from `field.tsx`)

Use the `Field` / `FieldLabel` / `FieldError` pattern from `@flaner/ui-components` for all form fields. **Never** create custom label+input wrappers from scratch.

### Pattern:
```tsx
import { Input, Field, FieldLabel, FieldError } from '@flaner/ui-components';

<Field data-invalid={!!errors.email}>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input
    id="email"
    type="email"
    placeholder="Enter your email"
    {...register('email')}
  />
  {errors.email?.message && (
    <FieldError>{errors.email.message}</FieldError>
  )}
</Field>
```

### Rules:
- Always pass `data-invalid={!!errors.fieldName}` to `<Field>` — this drives the red error styling
- Always pair `<FieldLabel htmlFor="id">` with `<Input id="id">` for accessibility
- `<FieldError>` renders nothing when empty — safe to render conditionally with `&&`

---

## Button (`button.tsx`)

Shadcn default button is fine, but ensure the `size` prop is used correctly:

| Prop | Height | Use case |
|------|--------|----------|
| `size="sm"` | 32px | Compact toolbars, inline actions |
| `size="default"` | 40px | Form submit buttons, standard CTAs |
| `size="lg"` | 48px | Hero CTAs, auth page actions |

For auth forms and primary actions always use `size="default"` or `size="lg"`.

---

## Package location

All shadcn components live in **`packages/ui-components/src/components/`** and are exported from `packages/ui-components/src/index.ts`.

- **Never** define shadcn components locally inside a feature package (e.g., inside `packages/core/src/components/ui/`)
- **Always** import from `@flaner/ui-components`
- To add a new shadcn component, run `npx shadcn add <component>` from inside `packages/ui-components/`

---

## Adding a new shadcn component

1. `cd packages/ui-components`
2. `npx shadcn add <component-name>` (if the CLI cannot resolve the `utils` alias in the monorepo, copy the component from the shadcn docs by hand and import `cn` from `@flaner/shared/utils`)
3. After adding, **check** the generated component for compact defaults and apply the corrections above if needed
4. Export it from `packages/ui-components/src/index.ts`
5. Import in consuming packages via `@flaner/ui-components`
