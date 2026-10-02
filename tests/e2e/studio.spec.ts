import { test, expect } from "@playwright/test";
test("real engine, signal, tabs, themes, recording, save and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (window !== window.top) return;
    localStorage.setItem("xxc-onboarded", "1");
    localStorage.setItem("xxc-theme", "dark");
    (window as any).signal = { peak: 0, events: 0 };
    addEventListener("message", (e) => {
      if (e.data.type === "recorded")
        (window as any).recordedBlob = e.data.blob;
      if (e.data.type === "frame") {
        (window as any).signal.peak = Math.max(
          (window as any).signal.peak,
          e.data.peak,
        );
        (window as any).signal.events = Math.max(
          (window as any).signal.events,
          e.data.events.length,
        );
      }
    });
  });
  await page.goto("/");
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".cm-content")).toContainText("REDSHIFT", {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page.waitForTimeout(700);
  const enable = frame.getByRole("button", {
    name: "ENABLE AUDIO",
    exact: false,
  });
  if (await enable.count()) await enable.click();
  await expect
    .poll(() => page.evaluate(() => (window as any).signal.peak), {
      timeout: 12000,
    })
    .toBeGreaterThan(0.001);
  await expect
    .poll(() => page.evaluate(() => (window as any).signal.events))
    .toBeGreaterThan(0);
  await expect(frame.locator(".cm-slider")).toBeVisible();
  await page.getByRole("button", { name: "REC", exact: true }).click();
  await page.waitForTimeout(1300);
  await page.locator(".record-button.active").click();
  await expect(
    page.getByRole("dialog", { name: "RECORDING / EXPORT" }),
  ).toBeVisible();
  await expect(page.locator("dialog audio")).toHaveAttribute("src", /^blob:/);
  const capturePeak = await page.evaluate(async () => {
    const data = await (window as any).recordedBlob.arrayBuffer();
    const view = new DataView(data);
    let peak = 0;
    for (let i = 44; i + 4 <= data.byteLength; i += 4)
      peak = Math.max(peak, Math.abs(view.getFloat32(i, true)));
    return peak;
  });
  expect(capturePeak).toBeGreaterThan(0.001);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "HUSH", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "drums.strudel" }).click();
  await expect(frame.locator(".cm-content")).toContainText("sparse pulse");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await frame.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// browser smoke checkpoint");
  await page.getByRole("tab", { name: "main.strudel", exact: true }).click();
  await page.getByRole("tab", { name: "drums.strudel", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(frame.locator(".cm-content")).not.toContainText(
    "browser smoke checkpoint",
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(frame.locator(".cm-content")).toContainText(
    "browser smoke checkpoint",
  );
  await page.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect(page.locator(".saved-indicator")).toContainText("SAVED", {
    timeout: 15000,
  });
  await page.reload();
  await expect(frame.locator(".cm-content")).toBeVisible({ timeout: 30000 });
  await page.getByRole("tab", { name: "drums.strudel" }).click();
  await expect(frame.locator(".cm-content")).toContainText(
    "browser smoke checkpoint",
  );
  await page.screenshot({
    path: `test-results/studio-${test.info().project.name}.png`,
  });
  expect(errors).toEqual([]);
});
test("mobile drawers and Sample Lab", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (window === window.top) localStorage.setItem("xxc-onboarded", "1");
  });
  await page.goto("/");
  await expect(page.frameLocator("iframe").locator(".cm-content")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator(".explorer")).not.toBeVisible();
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await expect(page.locator(".explorer")).toBeVisible();
  await page
    .getByRole("button", { name: "Collapse explorer", exact: true })
    .click();
  await page.getByRole("button", { name: "Sample Lab", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "SAMPLE LAB" })).toBeVisible();
  await page
    .locator("dialog input[type=file]")
    .setInputFiles("public/samples/tone.wav");
  await expect(page.getByText(/1.00 s ·/)).toBeVisible();
  await page.getByRole("button", { name: "reverse", exact: true }).click();
  await page.getByRole("button", { name: "normalize", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export WAV", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: `test-results/mobile-${test.info().project.name}.png`,
  });
});
test("library opens without execution, sample upload, cover, publish and share", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    if (window === top) localStorage.setItem("xxc-onboarded", "1");
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Library", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Minimal Beat", exact: true }),
  ).toBeVisible();
  const card = page.locator(".score-card").filter({
    has: page.getByRole("heading", { name: "Minimal Beat", exact: true }),
  });
  await card.getByRole("button", { name: "Open score" }).click();
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeVisible();
  await expect(
    page.frameLocator("iframe").locator(".cm-content"),
  ).toContainText("setcps");
  await page.getByRole("button", { name: "Sample Lab", exact: true }).click();
  await page
    .locator("dialog input[type=file]")
    .setInputFiles("public/samples/tone.wav");
  await page
    .getByRole("button", { name: "Save to project", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Insert into Strudel", exact: false }),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole("button", { name: "Insert into Strudel", exact: false })
    .click();
  await expect(
    page.frameLocator("iframe").locator(".cm-content"),
  ).toContainText("/media/");
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page.waitForTimeout(700);
  const enable = page
    .frameLocator("iframe")
    .getByRole("button", { name: "ENABLE AUDIO", exact: false });
  if (await enable.count()) await enable.click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "HUSH", exact: false }).click();
  await page
    .getByRole("button", { name: "Export / Share", exact: false })
    .click();
  await page
    .getByLabel("Project title", { exact: true })
    .fill("Browser publishing smoke");
  await page.getByLabel("Visibility", { exact: true }).selectOption("unlisted");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page
    .getByRole("button", { name: "GENERATE CODE COVER", exact: true })
    .click();
  await expect(page.getByRole("link", { name: "SVG master ↓" })).toBeVisible({
    timeout: 20000,
  });
  const link = page.locator(".share-link a");
  await expect(link).toBeVisible();
  const url = await link.getAttribute("href");
  const share = await context.newPage();
  await share.goto(url!);
  await expect(
    share.getByRole("heading", {
      name: "Browser publishing smoke",
      exact: true,
    }),
  ).toBeVisible();
  await expect(share.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/media\//,
  );
  await expect(share.locator("iframe")).toHaveCount(0);
  const dl = share.waitForEvent("download");
  await share.getByRole("link", { name: "DOWNLOAD ZIP ↓" }).click();
  expect((await dl).suggestedFilename()).toMatch(/\.zip$/);
  await share.close();
});
test.afterEach(async ({ page }) => {
  if (page.isClosed()) return;
  try {
    await page.evaluate(async () => {
      const session = await fetch("/api/session").then((r) => r.json());
      const list = await fetch("/api/projects").then((r) => r.json());
      for (const p of list.data || []) {
        if (
          ![
            "Redshift / 001",
            "Minimal Beat",
            "Browser publishing smoke",
          ].includes(p.title)
        )
          continue;
        for (const route of ["samples", "recordings", "exports"]) {
          const media = await fetch("/api/" + route).then((r) => r.json());
          for (const m of media.data || [])
            if (m.project_id === p.id)
              await fetch("/api/" + route + "/" + m.id, {
                method: "DELETE",
                headers: { "X-CSRF-Token": session.data.csrf },
              });
        }
        if (p.cover_id)
          await fetch("/api/covers/" + p.cover_id, {
            method: "DELETE",
            headers: { "X-CSRF-Token": session.data.csrf },
          });
        await fetch("/api/projects/" + p.id, {
          method: "DELETE",
          headers: { "X-CSRF-Token": session.data.csrf },
        });
      }
    });
  } catch {}
});
