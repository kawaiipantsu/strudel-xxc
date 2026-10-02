import { test, expect } from "@playwright/test";

test("music video scenes, layers, live response, fullscreen and settings persistence", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (window === top) localStorage.setItem("xxc-onboarded", "1");
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("tab", { name: "VISUALIZER", exact: true }).click();
  const canvas = page.locator(".video-preview canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-energy", "0.0000");
  await page.getByLabel("Scene duration").selectOption("2");
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page.waitForTimeout(600);
  const unlock = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await unlock.count()) await unlock.click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-energy")))
    .toBeGreaterThan(0.01);
  const scenes = [
    ["Particle Nebula", "nebula"],
    ["Liquid Lights", "liquid"],
    ["Fizzy Sparks", "sparks"],
    ["Mechanical Garden", "garden"],
    ["Signal Spiral", "spiral"],
    ["Chromatic Ribbons", "ribbons"],
    ["Color Ripples", "ripple"],
    ["Vector Tunnel", "tunnel"],
    ["Spectral Landscape", "terrain"],
  ];
  const frames = new Set<string>();
  for (const [label, id] of scenes) {
    await page.getByRole("button", { name: new RegExp(label) }).click();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute("data-scene", id);
    await page.waitForTimeout(1900);
    frames.add(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()));
  }
  expect(frames.size).toBe(9);
  await page.getByLabel("Rainbow Spider", { exact: true }).check();
  await page.getByLabel("Code Fragments", { exact: true }).check();
  await page.getByLabel("Visualizer palette").selectOption("aurora");
  await page
    .getByRole("checkbox", { name: "Use as studio background" })
    .check();
  await expect(page.locator(".studio-video-background canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Watch Music Video" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Fullscreen music visualizer",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("canvas")).toHaveAttribute(
    "data-scene",
    "terrain",
  );
  // The modal must be above the studio, including when native fullscreen succeeds.
  expect(
    await dialog.evaluate((d) => {
      const r = d.getBoundingClientRect();
      return d.contains(document.elementFromPoint(r.width / 2, r.height / 2));
    }),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Next fullscreen scene" }).click();
  await expect(dialog.locator("canvas")).not.toHaveAttribute(
    "data-scene",
    "terrain",
  );
  // Actual musical phase must advance the automatic director without a Next click.
  await page.evaluate(() => {
    const frame = document.querySelector("iframe")!;
    frame.contentWindow!.postMessage(
      {
        channel: "xxc-host",
        type: "load",
        file: "video-test.strudel",
        projectKey: "visualizer-test",
        generation: 999,
        code: 'setcps(4)\ns("sine*8").gain(.15)',
      },
      "*",
    );
    frame.contentWindow!.postMessage(
      { channel: "xxc-host", type: "evaluate", mode: "all" },
      "*",
    );
  });
  const shot = Number(await dialog.locator("canvas").getAttribute("data-shot"));
  await expect
    .poll(
      async () =>
        Number(await dialog.locator("canvas").getAttribute("data-shot")),
      { timeout: 15000 },
    )
    .toBeGreaterThan(shot);
  await dialog.hover({ position: { x: 500, y: 250 } });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save visual frame" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await dialog
    .getByRole("button", { name: "Close fullscreen visualizer" })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect(dialog).toBeVisible();
  // Browsers may consume Escape to exit native fullscreen before dispatching a dialog cancel.
  if (await page.evaluate(() => !!document.fullscreenElement)) {
    await page.evaluate(() => document.exitFullscreen());
  } else await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /HUSH/ }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-energy")))
    .toBeLessThan(0.001);
  await page.reload();
  await page.getByRole("tab", { name: "VISUALIZER", exact: true }).click();
  await expect(page.getByLabel("Visualizer palette")).toHaveValue("aurora");
  await expect(
    page.getByLabel("Rainbow Spider", { exact: true }),
  ).toBeChecked();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".video-preview canvas")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  expect(errors).toEqual([]);
});

test("mobile visualizer drawer and fullscreen fallback remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (window === top) localStorage.setItem("xxc-onboarded", "1");
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "Toggle tools", exact: true }).click();
  await page.getByRole("tab", { name: "VISUALIZER", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Watch Music Video" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Fullscreen music visualizer",
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close fullscreen visualizer" })
    .click();
  await expect(dialog).toHaveCount(0);
});
