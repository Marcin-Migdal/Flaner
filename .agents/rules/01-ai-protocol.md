# AI Orchestration Protocol

**CRITICAL INSTRUCTION FOR ALL AI INTERACTIONS:**
Before starting to generate any code, add new files, or modify existing ones, you MUST first execute the "Pre-Flight Protocol".

---

## 1. Core Pre-Flight Protocol (Universal)

Write the following section at the beginning of your response:

### Pre-Flight Protocol

1. **Task Type:** [Classify the task, e.g., New Feature, Refactor, Bugfix, UI Component, Configuration]
2. **Required Skills:** [List the names of matching skills from `.agents/skills/`. Then, read their `SKILL.md` files using the appropriate file inspection tool for your environment!]
3. **Action Plan:** [Break the task down into clear execution steps]

### Ironclad Rules:
- **PAUSE FOR APPROVAL:** You MUST wait for explicit user approval of the Action Plan before executing any file modifications or write operations.
- **NO AUTOMATIC GIT COMMITS / STAGING:** NEVER run `git add`, `git commit`, `git push`, or related git commands on your own initiative. Modifying the git index or commit history is strictly prohibited unless explicitly requested by the user in the prompt or agreed upon in the conversation.
- **READ BEFORE WRITE:** Do not modify or create files until you have read all relevant skills matching the task.
- **NEW FEATURES:** If the task involves a new functionality (new view, page, module, or large component), read and follow the `create-functionality` skill before writing code.
- **MANDATORY FOOTER:** Every response containing a plan and asking for confirmation must conclude with the exact footer listing all skills and markdown context files read.

---

## 2. Environment: Antigravity (Gemini)

When operating within Google Antigravity / Gemini CLI:

- **File Inspection:** Use `view_file` to read `SKILL.md` files and source code.
- **Modifying Files:** Use `replace_file_content` for edits and `write_to_file` for new files (only after user approval).
- **Skills Location:** Look for skills under `.agents/skills/` (or legacy fallback `.gemini/skills/`).
- **Terminal Execution:** Use Antigravity terminal execution commands for running linters or builds (`npx nx run <project>:lint`).

---

## 3. Environment: Cursor (Claude / GPT / Gemini / Multi-Model)

When operating within Cursor IDE (Agent / Composer mode):

- **Tooling Mapping:**
  - **Read Files:** Use `Read` to inspect code and `SKILL.md` files.
  - **Edit Files:** Use `StrReplace` for targeted file edits (prefer this over overwriting).
  - **Create Files:** Use `Write` only when creating new files or when explicitly required.
  - **Search:** Use `Grep` and `Glob` instead of terminal grep/find.
  - **Terminal / Shell:** Use `Shell` for build, lint, and git operations (`npx nx run <pkg>:lint`, etc.). Note: On Windows, run shell tasks with appropriate permissions when needed.
- **Skills Discovery:**
  - Cursor automatically indexes `.agents/skills/*/SKILL.md` into available agent skills.
  - All models (Claude 3.7/3.5, GPT-4o/o3, Gemini) share the same access to these skills and must invoke or read them according to Pre-Flight Protocol.
- **Git Restrictions:**
  - Cursor agents (Opus, Sonnet, etc.) must NEVER perform automatic `git add`, `git commit`, or staging after completing an edit.
  - All git actions require an explicit request from the user.
- **Global Rules:**
  - `.agents/AGENTS.md` and `.agents/rules/*.md` serve as the primary operational context.
