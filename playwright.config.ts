import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
export default defineConfig({
  testDir: "tests/e2e",
  // Traces include audio/video responses. Keep them off the live media volume.
  outputDir:
    process.env.XXC_TEST_OUTPUT_DIR ||
    join(tmpdir(), "xxc-strudel-browser-results"),
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
