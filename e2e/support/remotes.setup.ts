import { expect, test as setup } from "@playwright/test";

// Playwright's webServer only waits for the host (4200). The MFE remotes start
// independently, so every project depends on this setup, which waits until each
// remoteEntry.js answers. (A setup project runs after webServer; globalSetup runs before it.)
const REMOTE_PORTS = [4201, 4202, 4203, 4204, 4205];

setup("wait for MFE remotes", async ({ request }) => {
  setup.setTimeout(120_000);
  for (const port of REMOTE_PORTS) {
    await expect
      .poll(() => request.get(`http://localhost:${port}/remoteEntry.js`).then((res) => res.ok(), () => false), {
        message: `MFE remote on :${port} did not start`,
        timeout: 110_000,
      })
      .toBe(true);
  }
});
