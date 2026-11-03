// Local development against the Firebase emulators instead of the real DEV project.
// Usage: npm run dev:emulators
// Starts, side by side: the rules compiler in watch mode, the Auth + Firestore emulators (they hot-reload
// firestore.rules) and all dev servers wired to the emulators. Emulator data persists in .emulator-data/.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = ".emulator-data";
// Same offline-only project as the E2E runner (e2e/support/helpers/emulator.ts)
const PROJECT_ID = "demo-flaner";

const emulatorArgs = ["firebase", "emulators:start", "--only", "auth,firestore", "--project", PROJECT_ID];
if (existsSync(path.join(ROOT, DATA_DIR, "firebase-export-metadata.json"))) emulatorArgs.push("--import", DATA_DIR);
emulatorArgs.push(`--export-on-exit=${DATA_DIR}`);

const processes = [
  { name: "rules", command: "node", args: ["scripts/firestore-rules.mjs", "--watch"] },
  { name: "emulators", command: "npx", args: emulatorArgs },
  {
    name: "dev",
    command: "npm",
    args: ["run", "dev"],
    env: {
      VITE_USE_EMULATORS: "true",
      VITE_PROJECT_ID: PROJECT_ID,
      VITE_API_KEY: "demo-api-key",
      VITE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
    },
  },
];

const isWindows = process.platform === "win32";
let stopping = false;

// npm / npx do not forward signals, so each child gets its own process group (POSIX) and the whole group
// is signalled. On Windows Ctrl+C already reaches every process of the console.
const stopChild = (child, force) => {
  if (isWindows) {
    if (force && child.exitCode === null) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  // Signal the group even when its leader is gone, its descendants may still run
  try {
    process.kill(-child.pid, "SIGINT");
  } catch {
    // Group already empty
  }
};

const stopAll = (force) => {
  stopping = true;
  children.forEach((child) => stopChild(child, force));
};

const children = processes.map(({ name, command, args, env }) => {
  const child = spawn(command, args, {
    cwd: ROOT,
    // No stdin: a background process group reading the terminal would be stopped (SIGTTIN)
    stdio: ["ignore", "inherit", "inherit"],
    shell: isWindows,
    detached: !isWindows,
    env: { ...process.env, ...env },
  });
  child.on("exit", (code) => {
    if (stopping) return;
    console.error(`dev-emulators: "${name}" exited (${code ?? "signal"}), stopping the rest...`);
    stopAll(true);
  });
  return child;
});

// The emulators export their data on SIGINT; this process exits once every child is gone
process.on("SIGINT", () => stopAll(false));
process.on("SIGTERM", () => stopAll(false));
