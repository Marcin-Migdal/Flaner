# Feature Development Workflow (Planner - Executor - Reviewer)

This workflow defines the lifecycle for implementing complex features. By breaking the work into distinct phases, we ensure high quality, correct architecture, and minimize context pollution.

## Phase 1: Planning (The Planner)
Before any code is written:
1. **Analyze Requirements:** Review the user's request, identify the scope, and clarify any ambiguities.
2. **Read Relevant Skills:** Identify and read (`view_file`) the required skills from `.gemini/skills/` (e.g., `create-functionality`, `react-hook-form`, `api-query-layer`).
3. **Generate Implementation Plan:** Draft a detailed plan (create an artifact or a `.md` file in the `.gemini/brain/...` folder) outlining the architecture, the specific files to touch, and the technical approach.
4. **Get Approval:** Wait for the user to explicitly approve the implementation plan.

## Phase 2: Execution (The Executor)
Once the plan is approved:
1. **Task Breakdown:** Create a checklist (e.g., `task.md` artifact).
2. **Iterative Implementation:** Work on one logical chunk (e.g., UI component, API hook, routing) at a time.
3. **Update Status:** Check off completed tasks to maintain momentum and track progress.
4. **Strict Adherence:** Follow the `02-project-standards.md` and `03-package-structures.md` rules strictly.

## Phase 3: Review (The Reviewer)
After implementation is complete:
1. **Linting:** Ensure `nx lint` has been run dynamically on the modified packages (e.g., `npx nx run <package-name>:lint`).
2. **Skill Verification:** Double-check the modified/created code against the core skills used in Phase 1 (e.g., verify that `react-hook-form` inputs use `FormProvider`).
3. **Walkthrough:** Summarize the changes in a `walkthrough.md` artifact so the user knows exactly what was built and how to test it.
