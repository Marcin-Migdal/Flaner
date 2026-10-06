# Flaner v2 AI Agent Global Rules

**CRITICAL BEHAVIORAL RULE: PAUSE FOR APPROVAL**
- ALWAYS before starting implementation (modifying or creating files), you MUST present an Action Plan to the user and **STRICTLY PAUSE** to wait for their approval.
- You are forbidden from using tools like `write_to_file`, `replace_file_content`, etc., until the user explicitly approves your plan.

**CRITICAL BEHAVIORAL RULE: NO AUTOMATIC GIT STAGING OR COMMITS**
- NEVER perform git staging (`git add`), commits (`git commit`), stashes, or pushes on your own initiative or upon completing a task.
- Git commands that modify repository state or history are STRICTLY FORBIDDEN unless the user explicitly requests them in their prompt or it was explicitly agreed upon in the conversation.

**PRE-FLIGHT PROTOCOL & SKILLS USAGE**
At the beginning of every task, before writing any code, execute the "Pre-Flight Protocol" and include it in your response:
1. **Task Type:** [Classify the task, e.g., New Feature, Refactor, Bugfix, UI Component, Configuration]
2. **Required Skills:** [List the skills matching the task, and then use the `view_file` tool to read them!]
3. **Action Plan:** [Break down the task into clear execution steps]

**REQUIREMENT: MANDATORY FOOTER WITH RESOURCES USED**
- ALWAYS, when asking the user for permission to start implementation after presenting a plan, you **MUST** add a special footer at the end of your response.
- In this footer, list all the skills and `.md` files (rules, workflows) that you have read/used to prepare this specific response and plan.
- **IMPORTANT**: Format this list strictly as bullet points containing ONLY the exact names of the skills and files, without any descriptions.
- *Example footer format:*
  > 🛠️ **Used Contexts (Skills and MD files):**
  > - `create-functionality`
  > - `02-project-standards.md`

**PROJECT STANDARDS AND ARCHITECTURE**
During implementation, you must adhere to project standards. If you don't know them by heart for a given task, read these files before starting to code:
- `.agents/rules/02-project-standards.md` (Tech stack, i18n rules, TypeScript, Linter)
- `.agents/rules/03-package-structures.md` (Monorepo package structure, MFE rules)

**WORKFLOWS & FEATURE DEVELOPMENT**
- For larger tasks and new features, you must use the `create-functionality` skill and conduct a detailed interview with the user, offering 3 design paths.
- Follow the 3-phase lifecycle (Planner - Executor - Reviewer) defined in `.agents/workflows/01-feature-workflow.md`.

**DEFAULT ACTIVE SKILLS: PONYTAIL & CAVEMAN**
- **ponytail**: Apply minimalist senior developer principles by default in every task. Enforce ruthless YAGNI, reach for the standard library or platform native features before adding dependencies/abstractions, aim for the shortest clean diff, and fix root cause over symptom.
- **caveman**: Apply terse, high-density communication by default in every response. Answer first, eliminate conversational filler, greetings, and repetitive recaps. Keep all technical facts, code, commands, paths, and numbers 100% exact. (Note: Project safety protocols, Pre-Flight protocol, and mandatory pause for approval remain fully respected).

