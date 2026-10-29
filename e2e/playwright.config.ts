import { defineConfig, devices } from "@playwright/test";
import { E2E_API_KEY, E2E_PROJECT_ID } from "./support/helpers/emulator";

const PORT = 4200;
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ["html", { outputFolder: "../playwright-report", open: "never" }],
    ["list"],
  ],
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "core",
      testMatch: /core\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "community",
      testMatch: /community\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "settings",
      testMatch: /settings\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "planning",
      testMatch: /planning\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "shopping",
      testMatch: /shopping\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "tools",
      testMatch: /tools\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /mobile\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  // E2E never touches a real Firebase project: the app runs against local emulators
  // (`demo-` project ids cannot reach the cloud). Servers are never reused, so a
  // locally running `npm run dev` (wired to production) can't leak into tests —
  // stop it before running E2E.
  webServer: [
    {
      command: `npx firebase emulators:start --only auth,firestore --project ${E2E_PROJECT_ID}`,
      url: "http://127.0.0.1:9099",
      reuseExistingServer: false,
      timeout: 120 * 1000,
    },
    {
      command: "npm run dev",
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120 * 1000,
      env: {
        VITE_USE_EMULATORS: "true",
        VITE_PROJECT_ID: E2E_PROJECT_ID,
        VITE_API_KEY: E2E_API_KEY,
        VITE_AUTH_DOMAIN: `${E2E_PROJECT_ID}.firebaseapp.com`,
      },
    },
  ],
});
