# AI Orchestration Protocol

**CRITICAL INSTRUCTION FOR ALL AI INTERACTIONS:**
Before starting to generate any code, add new files, or modify existing ones, you MUST first execute the "Pre-Flight Protocol".

Write the following section in your response:

### Pre-Flight Protocol

1. **Task Type:** [Classify the task, e.g., New Feature, Refactor, Bugfix, UI Component, Configuration]
2. **Required Skills:** [List the names of the skills from the `.gemini/skills/` folder that match this task. Then, use the `view_file` tool to read their `SKILL.md` files!]
3. **Action Plan:** [Break the task down into clear execution steps]

**IRONCLAD RULE:**

- Do not start modifying files (e.g., via `write_to_file` or `replace_file_content`) until you have read the skills selected in step 2.
- If the task is large and involves a new functionality (view, page, new module, big component), you must read the `create-functionality` skill and follow it before writing any code.
