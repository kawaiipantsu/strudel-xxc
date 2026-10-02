import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "https://strudel.xxc.dk",
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: false,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          args: ["--no-sandbox"],
        },
      },
    },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }]],
});
