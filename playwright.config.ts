import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173", // Default Vite dev server URL
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile browsers if needed
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Allow extra time for Vite to start
  },

  // viteConfig: {
  //   resolve: {
  //     alias: {
  //       "@": path.resolve(__dirname, "./src"),
  //       "@components": path.resolve(__dirname, "./src/components"),
  //       "@hooks": path.resolve(__dirname, "./src/hooks"),
  //       "@slices": path.resolve(__dirname, "./src/app/slices"),
  //       "@utils": path.resolve(__dirname, "./src/utils"),
  //       "@commonAssets": path.resolve(__dirname, "./src/commonAssets"),
  //       "@services": path.resolve(__dirname, "./src/app/services"),
  //       "@i18n": path.resolve(__dirname, "./src/i18n.ts"),
  //     },
  //   },
  // },
});
