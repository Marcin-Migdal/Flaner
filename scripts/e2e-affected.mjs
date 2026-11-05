// Picks the Playwright projects (e2e/playwright.config.ts) affected by a PR.
// Usage: node scripts/e2e-affected.mjs <base-sha>
// Writes to $GITHUB_OUTPUT (and stdout): `run` (anything to test), `full` (whole suite)
// and `projects` (`--project=<name>` flags; empty when full).
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const MFES = ["community", "settings", "planning", "shopping", "tools"];
const FULL_SUITE_PACKAGES = ["core", "shared", "ui-components", "test-utils"];
// Files outside packages/ that cannot affect E2E.
const IGNORED = [/^\.agents\//, /\.md$/];

const base = process.argv[2];
if (!base) throw new Error("Usage: node scripts/e2e-affected.mjs <base-sha>");

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();

const affected = JSON.parse(run("npx", ["nx", "show", "projects", "--affected", `--base=${base}`, "--head=HEAD", "--json"]));
const changedFiles = run("git", ["diff", "--name-only", `${base}...HEAD`]).split("\n").filter(Boolean);

const projects = new Set();
let full = affected.some((p) => FULL_SUITE_PACKAGES.includes(p));

for (const mfe of MFES) {
  if (affected.includes(mfe)) projects.add(mfe).add("core").add("mobile");
}

for (const file of changedFiles) {
  if (file.startsWith("packages/") || IGNORED.some((re) => re.test(file))) continue;
  const e2eProject = file.match(/^e2e\/(core|mobile|community|settings|planning|shopping|tools)\//)?.[1];
  if (e2eProject) projects.add(e2eProject);
  else full = true; // e2e/support, e2e config, root config, lockfile, CI
}

const flags = full ? "" : [...projects].map((p) => `--project=${p}`).join(" ");
const output = `full=${full}\nprojects=${flags}\nrun=${full || projects.size > 0}\n`;
console.log(`nx affected: ${affected.join(", ") || "-"}`);
console.log(output);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
