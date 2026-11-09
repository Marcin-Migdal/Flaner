import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Reference screenshots of real views for the "Flaner" Design System in Claude (#62): npm run design:screens.
// Same emulators + dev servers as E2E; not part of `npm run e2e` or CI. Output: .design-system/screens/
export default defineConfig({
  ...base,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { ...base.use, video: "off", trace: "off", screenshot: "off" },
  projects: [
    { name: "setup", testMatch: /support\/remotes\.setup\.ts/ },
    { name: "screens", testMatch: /screens\/.*\.screens\.ts/, dependencies: ["setup"], use: { ...devices["Desktop Chrome"] } },
  ],
});
