import { defineConfig } from "cypress";

const config = defineConfig({
    viewportWidth: 1536,
    viewportHeight: 960,

    video: false,
    screenshotOnRunFailure: false,

    e2e: {
        setupNodeEvents() {},
        specPattern: "cypress/e2e/**/*.cy.{js,ts,jsx,tsx}",
        excludeSpecPattern: ["**/__snapshots__/*", "**/__image_snapshots__/*"],
    },
});

export default config;
