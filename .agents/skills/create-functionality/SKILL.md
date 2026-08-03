---
name: create-functionality
description: Structured planning workflow for designing and implementing new features or views in the Flaner v2 project. Make sure to use this skill whenever the user mentions building a new view, adding a feature, creating something from scratch, or says things like "let's plan" or "new task." This skill runs an interactive interview BEFORE any code is written, covering requirements, technical enhancements, design paths, and producing a full implementation plan.
---

# create-functionality

This skill guides you through a structured planning process before writing any code. The goal is to avoid situations where the implementation does not match the user's actual intent.

Trigger this whenever the user asks for a new feature, view, or major functionality. **Do not start coding until the user approves the implementation plan.**

## Step-by-Step Process

The process consists of conversational stages where you first gather requirements and propose improvements (Stage 1 and 2), **wait for the user's response**, and then, based on their feedback, propose design paths (Stage 3). 

---

## Stage 1 — Gathering Requirements

Analyze the user's request and extract:
- What functionalities should be available (bulleted list)
- What is **explicitly excluded** (e.g., "no notifications for now")
- Whether a specific MFE / package / implementation location is specified
- Any additional hints (mobile view, dark/light mode, existing components, etc.)

If anything is missing — ask, but do not ask more than 2-3 questions at a time.

---

## Stage 2 — Your Improvement Proposals

Before proposing a design, **actively propose technical and UX improvements** that the user might not have thought of. Examples from past sessions:

- Debouncing search (300ms) instead of querying on every keystroke
- Case-insensitive prefix search via a dedicated `*Lower` field in the database
- Excluding the logged-in user from search results
- Result limits (e.g., top 20) for Firestore performance
- Optimistic UI — instant button reaction before the database confirms the save
- Responsiveness / mobile view (always check if it's considered)
- Empty states, loading states, error states for all data
- Handling edge cases (no results, offline network, empty state)

List your proposals and ask if the user accepts them. **Wait for the user's response to Stage 1 and 2 before moving to Stage 3.**

---

## Stage 3 — Design Path Proposals (After feedback)

Propose **at least 3 different design paths** (never fewer). Each path should:

1. Have a short, catchy name (e.g., "Tabbed Hub", "Split-Screen Dashboard", "Grid with Drawer")
2. Contain a **UI layout description** — what is visible immediately, what is hidden behind an action
3. Describe the **styling** — animations, cards, spacing, shadcn components you would use
4. List the **advantages** of this approach

Ask the user which path suits them, or if they want to **combine elements** from several. Wait for a response.

---

## Stage 4 — Refining the Selected Design

After the user's choice:
- Confirm understanding: "So I understand you want X with element Y from path Z — is that correct?"
- Ask about any ambiguities.

---

## Stage 5 — Detailed Implementation Plan

Only after the design is confirmed, create an `implementation_plan.md` artifact with:

### Plan Structure

```markdown
# [Feature Name]

## Goal
Short description of what this feature does and why.

## Accepted Technical Improvements
List of proposals accepted by the user.

## Selected Design
Description of the chosen path (or combination) with justification.

## Data Structure (Firestore)
Collections, fields, relations, indexes if needed.

## Component Architecture
- src/pages/ — routing views (*View.tsx)
- src/components/ — sub-components
- src/hooks/ — query and mutation hooks (one hook = one file)
- src/api/ — endpoints.ts with Firestore functions
- public/locales/ — translation keys

## Files to Create / Modify
[NEW] path/to/file.tsx — description
[MODIFY] path/to/existing.tsx — what changes
[MODIFY] locales/en/namespace.json — new keys

## Verification Plan
How to verify it works (build, manual tests).

## Open Questions
If anything is unclear or requires a user decision.
```

Set `RequestFeedback: true` in the artifact metadata and wait for approval.

---

## Stage 6 — Implementation

Only after explicit approval of the plan by the user:
1. Create a `task.md` with a checklist of steps.
2. Implement according to the plan.
3. Adhere strictly to the project rules (`02-project-standards.md`, `03-package-structures.md`) and other skills.
4. Update `task.md` continuously.

---

## Important Rules

- **Never code before the plan is approved** by the user.
- **Always propose at least 3 design paths** — never just one ready-made proposal.
- **Actively propose technical improvements** the user didn't ask for.
- Remember: mobile view, loading/error/empty states, i18n (no hardcoded texts).
- Shadcn `Sheet` is better than `Sidebar` for flyout panels.
- Each hook has its own file, each view is in `src/pages/`, components in `src/components/`.
