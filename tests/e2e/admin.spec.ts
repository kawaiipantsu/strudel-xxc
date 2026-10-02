import { test, expect } from "@playwright/test";
import fs from "node:fs";
test.use({ trace: "off", screenshot: "off" });
test("admin authentication, settings and moderation panels", async ({
  page,
}) => {
  const creds = fs.readFileSync("docs/ADMIN_CREDS.md", "utf8");
  const password = creds.match(/Access code: `([^`]+)`/)?.[1];
  expect(password).toBeTruthy();
  await page.goto("/admin/");
  await page.getByLabel("Access code", { exact: true }).fill(password!);
  await page
    .getByRole("button", { name: "AUTHENTICATE", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "dashboard", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Service health", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "GLOBAL SETTINGS", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "SAVE SETTINGS", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "SAVE SETTINGS", exact: true })
    .click();
  await expect(
    page.getByText("Global configuration saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "LIBRARY", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: /Minimal Beat/ }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "SAMPLES", exact: true }).click();
  await expect(
    page.getByText("Files without an associated project", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "SYSTEM", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "PHP modules" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "System access." }),
  ).toBeVisible();
});
