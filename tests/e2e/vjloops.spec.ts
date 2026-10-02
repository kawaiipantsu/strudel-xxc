import { test, expect, type Page } from "@playwright/test";
async function setup(page: Page) {
  await page.addInitScript(() => {
    if (window === top) localStorage.setItem("xxc-onboarded", "1");
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page.waitForTimeout(600);
  const unlock = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await unlock.count()) await unlock.click();
  await page.getByRole("tab", { name: "VISUALIZER", exact: true }).click();
  await page.getByRole("button", { name: "VJ Loops", exact: true }).click();
}
async function current(page: Page) {
  return page.locator(".video-preview .vj-playback").evaluate((node) => {
    const id = (node as HTMLElement).dataset.clip;
    const video = Array.from(node.querySelectorAll("video")).find(
      (v) => v.dataset.clip === id,
    );
    return {
      id,
      time: video?.currentTime || 0,
      paused: video?.paused ?? true,
      muted: video?.muted || false,
      ready: video?.readyState || 0,
    };
  });
}

test("VJ packs play real muted videos, keep overlays, switch clips, fullscreen and snapshot", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect(
    page.getByRole("region", { name: "VJ loop library" }),
  ).toContainText("146 clips · 3 packs");
  const catalogue = await (
    await page.request.get("/vjloops/catalog.json")
  ).json();
  for (const pack of ["pack1", "pack2", "pack3"]) {
    await page.getByLabel("VJ pack", { exact: true }).selectOption(pack);
    const targets = [catalogue.clips.find((c: any) => c.pack === pack)];
    // These original MP4 encodings stalled around 0.1 s in WebKit despite
    // passing codec inspection. Verify the normalized delivery, not just a poster.
    if (pack === "pack1")
      targets.push(
        catalogue.clips.find(
          (c: any) => c.title === "BEEPLE MANIFEST MONEY BURNING D",
        ),
      );
    for (const clip of targets) {
      expect(clip).toBeTruthy();
      await page.getByLabel("Search VJ clips").fill(clip.title);
      await page
        .getByRole("button", {
          name: "Play VJ clip " + clip.title,
          exact: true,
        })
        .click();
      await page.locator(".video-preview").scrollIntoViewIfNeeded();
      await expect(page.locator(".video-preview .vj-playback")).toHaveAttribute(
        "data-clip",
        clip.id,
      );
      await expect
        .poll(async () => (await current(page)).time, { timeout: 20000 })
        .toBeGreaterThan(0.2);
      const video = await current(page);
      expect(video.muted).toBe(true);
      expect(video.paused).toBe(false);
      expect(video.ready).toBeGreaterThanOrEqual(2);
    }
    await page.getByLabel("Search VJ clips").fill("");
  }
  await page.getByLabel("Rainbow Spider", { exact: true }).check();
  await page.getByLabel("VJ framing").selectOption("contain");
  await page.locator(".video-preview").scrollIntoViewIfNeeded();
  const before = (await current(page)).id;
  await page
    .getByRole("button", { name: "Next visual scene", exact: true })
    .click();
  await expect
    .poll(async () => (await current(page)).id, { timeout: 20000 })
    .not.toBe(before);
  const selected = (await current(page)).id;
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Fullscreen music visualizer",
  });
  await expect(dialog).toBeVisible();
  await dialog
    .locator("canvas")
    .click({ position: { x: 200, y: 300 }, force: true });
  await expect(dialog.locator(".presentation-chrome")).toHaveCSS(
    "opacity",
    "0",
    { timeout: 5000 },
  );
  await dialog.hover({ position: { x: 300, y: 400 } });
  await expect(dialog.locator(".presentation-chrome")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(dialog.locator(".vj-playback")).toHaveAttribute(
    "data-clip",
    selected!,
    { timeout: 20000 },
  );
  expect(
    await dialog.evaluate((d) =>
      d.contains(document.elementFromPoint(innerWidth / 2, innerHeight / 2)),
    ),
  ).toBe(true);
  const saved = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save visual frame" }).click();
  expect((await saved).suggestedFilename()).toMatch(/\.png$/);
  await dialog
    .getByRole("button", { name: "Close fullscreen visualizer" })
    .click();
  await expect(page.locator(".video-preview .vj-playback")).toHaveAttribute(
    "data-clip",
    selected!,
  );
  await page
    .getByRole("checkbox", { name: /Music Video · automatic scenes/ })
    .check();
  await page.getByLabel("Scene duration").selectOption("2");
  await page.evaluate(() => {
    const frame = document.querySelector("iframe")!.contentWindow!;
    frame.postMessage(
      {
        channel: "xxc-host",
        type: "load",
        file: "vj-test.strudel",
        projectKey: "vj-test",
        generation: 999,
        code: 'setcps(2)\ns("sine*8").gain(.2)',
      },
      "*",
    );
    frame.postMessage(
      { channel: "xxc-host", type: "evaluate", mode: "all" },
      "*",
    );
  });
  await page.locator(".video-preview").scrollIntoViewIfNeeded();
  await expect
    .poll(async () => (await current(page)).id, { timeout: 20000 })
    .not.toBe(selected);
  await page.getByRole("button", { name: "HUSH", exact: true }).click();
  await expect.poll(async () => (await current(page)).paused).toBe(true);
  await page.reload();
  await page.getByRole("tab", { name: "VISUALIZER", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "VJ Loops", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("VJ pack", { exact: true })).toHaveValue(
    "pack3",
  );
  await expect(page.getByLabel("Scene duration")).toHaveValue("2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => (await current(page)).paused).toBe(true);
  expect(errors).toEqual([]);
});

test("VJ videos pause when the preview is hidden and mobile fullscreen is usable", async ({
  page,
}) => {
  await setup(page);
  await expect
    .poll(async () => (await current(page)).time, { timeout: 20000 })
    .toBeGreaterThan(0.2);
  await page.locator(".video-preview").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    (window as any).oldVideos = Array.from(
      document.querySelectorAll(".vj-playback video"),
    );
  });
  await page.getByRole("tab", { name: "VISUALS", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as any).oldVideos.every(
        (v: HTMLVideoElement) => v.paused && !v.getAttribute("src"),
      ),
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "VISUALIZER", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Watch Music Video", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Fullscreen music visualizer",
  });
  await expect(dialog).toBeVisible();
  await expect
    .poll(
      () =>
        dialog
          .locator(".vj-playback video")
          .evaluateAll((videos) =>
            videos.some(
              (v) =>
                (v as HTMLVideoElement).currentTime > 0.1 &&
                !(v as HTMLVideoElement).paused,
            ),
          ),
      { timeout: 20000 },
    )
    .toBe(true);
  await dialog
    .getByRole("button", { name: "Close fullscreen visualizer" })
    .click();
  await page.getByRole("button", { name: "HUSH", exact: true }).click();
});
