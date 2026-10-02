import { webkit } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync("assets/screenshots", { recursive: true });
const browser = await webkit.launch();
const page = await browser.newPage({
  viewport: { width: 1500, height: 1000 },
  deviceScaleFactor: 1,
});
await page.addInitScript(() => {
  if (window === top) {
    localStorage.setItem("xxc-onboarded", "1");
    localStorage.setItem("xxc-theme", "dark");
  }
});
await page.goto("https://strudel.xxc.dk");
await page
  .getByRole("button", { name: "PLAY", exact: true })
  .waitFor({ timeout: 30000 });
await page.waitForTimeout(500);
await page.getByRole("button", { name: "PLAY", exact: true }).click();
await page.waitForTimeout(700);
const enable = page
  .frameLocator("iframe")
  .getByRole("button", { name: /ENABLE AUDIO/ });
if (await enable.count()) await enable.click();
await page.waitForTimeout(1500);
await page.screenshot({ path: "assets/screenshots/studio-dark.png" });
await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "assets/screenshots/studio-light.png" });
await page.getByRole("button", { name: /HUSH/ }).click();
await browser.close();
console.log("Captured dark and light studio views with live audio.");
