import { test, expect } from "@playwright/test";
test("Banks finds canonical names and aliases, inserts playable voices and discovers custom banks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (window !== top) return;
    localStorage.setItem("xxc-onboarded", "1");
    (window as any).bankPeak = 0;
    addEventListener("message", (e) => {
      if (e.data?.type === "frame")
        (window as any).bankPeak = Math.max(
          (window as any).bankPeak,
          e.data.peak,
        );
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("tab", { name: "BANKS", exact: true }).click();
  const banks = page.getByRole("region", { name: "Available sound banks" });
  await banks.getByLabel("Search banks").fill("TR909");
  const bank = banks.getByRole("article", { name: "RolandTR909 bank" });
  await expect(bank).toBeVisible();
  const editor = page.frameLocator("iframe").locator(".cm-content");
  await editor.click();
  await page.keyboard.press("Control+a");
  await bank
    .getByRole("button", {
      name: "Insert example for RolandTR909",
      exact: true,
    })
    .click();
  await expect(editor).toHaveText('s("bd").bank("RolandTR909")');
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page.waitForTimeout(700);
  const unlock = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await unlock.count()) await unlock.click();
  await expect
    .poll(() => page.evaluate(() => (window as any).bankPeak))
    .toBeGreaterThan(0.001);
  await page.getByRole("button", { name: "HUSH", exact: true }).click();
  await editor.click();
  await page.keyboard.press("Control+End");
  await bank
    .getByRole("button", { name: "Insert bank alias TR909", exact: true })
    .click();
  await expect(editor).toContainText('.bank("TR909")');
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(editor).not.toContainText('.bank("TR909")');
  await bank.locator("summary").click();
  await expect(
    bank.getByRole("button", {
      name: "Insert RolandTR909 voice bd",
      exact: true,
    }),
  ).toBeVisible();
  await banks.getByLabel("Search banks").fill("gm");
  await expect(
    banks.getByRole("article", { name: "gm bank", exact: true }),
  ).toContainText("General MIDI");
  await page.evaluate(() =>
    document
      .querySelector("iframe")!
      .contentWindow!.postMessage(
        {
          channel: "xxc-host",
          type: "samples",
          map: { testbank_kick: ["https://strudel.xxc.dk/samples/bd.wav"] },
        },
        "*",
      ),
  );
  await banks.getByRole("button", { name: "Refresh banks" }).click();
  await banks.getByLabel("Search banks").fill("testbank");
  await expect(
    banks.getByRole("article", { name: "testbank bank" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test.afterEach(async ({ page }) => {
  await page
    .evaluate(async () => {
      const session = await fetch("/api/session").then((r) => r.json());
      const projects = await fetch("/api/projects").then((r) => r.json());
      for (const project of projects.data || [])
        if (project.title === "Redshift / 001")
          await fetch("/api/projects/" + project.id, {
            method: "DELETE",
            headers: { "X-CSRF-Token": session.data.csrf },
          });
      localStorage.removeItem("xxc-draft");
    })
    .catch(() => {});
});
