// SessionStart hook: cloud Claude Code sessions don't install plugins from project settings
// and have no `.claude/skills` junction (gitignored), so set both up there. No-op locally.
import { execSync } from "node:child_process";
import { existsSync, symlinkSync } from "node:fs";

if (process.env.CLAUDE_CODE_REMOTE !== "true") process.exit(0);

const run = (cmd) => {
  try {
    execSync(cmd, { stdio: "pipe" });
    return "ok";
  } catch (error) {
    return `failed: ${String(error.stderr || error.message).trim().split("\n")[0]}`;
  }
};

const log = [];
if (!existsSync(".claude/skills")) {
  symlinkSync("../.agents/skills", ".claude/skills");
  log.push("linked .claude/skills -> .agents/skills");
}
log.push(`marketplace add mattpocock/skills: ${run("claude plugin marketplace add mattpocock/skills")}`);
log.push(`plugin install mattpocock-skills@mattpocock: ${run("claude plugin install mattpocock-skills@mattpocock")}`);

console.log(`[claude-cloud-setup] ${log.join("; ")}`);
