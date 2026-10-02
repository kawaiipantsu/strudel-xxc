import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";

const headers = { "User-Agent": "XXC-Strudel-Integration-Tests/1.0" };
let created: { id: string; csrf: string }[] = [];
async function score(
  request: APIRequestContext,
  code = 'setcps(1)\nn("0 3 7 10").scale("D4:minor").s("sine").gain(.3)',
) {
  const session = await (await request.get("/api/session", { headers })).json();
  const result = await (
    await request.post("/api/projects", {
      headers: { ...headers, "X-CSRF-Token": session.data.csrf },
      data: {
        title: "Share player verification",
        visibility: "unlisted",
        entry_file: "listen.strudel",
        files: [
          { path: "listen.strudel", content: code },
          {
            path: "other.strudel",
            content: 'throw new Error("The non-entry score must not run")',
          },
        ],
      },
    })
  ).json();
  expect(result.ok).toBe(true);
  created.push({ id: result.data.id, csrf: session.data.csrf });
  return result.data;
}
test.afterEach(async ({ request }) => {
  for (const p of created)
    await request.delete("/api/projects/" + p.id, {
      headers: { ...headers, "X-CSRF-Token": p.csrf },
    });
  created = [];
});
async function unlock(page: Page) {
  await expect
    .poll(
      async () => {
        const enable = page
          .frameLocator("iframe")
          .getByRole("button", { name: /ENABLE AUDIO/ });
        return (
          (await enable.count()) > 0 ||
          (await page.locator(".share-player-status").textContent())?.includes(
            "PLAYING",
          )
        );
      },
      { timeout: 30000 },
    )
    .toBeTruthy();
  const enable = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await enable.count()) await enable.click();
  await expect(page.locator(".share-player-status")).toContainText("PLAYING");
}
async function videoTime(page: Page) {
  return page
    .locator(".vj-playback video")
    .evaluateAll((videos) =>
      Math.max(0, ...videos.map((v) => (v as HTMLVideoElement).currentTime)),
    );
}
test("shared score stays inert until Play, then plays entry audio and VJ loops in a 720p fullscreen player", async ({
  page,
  request,
}) => {
  const project = await score(request);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (window !== top) return;
    (window as any).playerTest = { peak: 0, errors: [] };
    addEventListener("message", (e) => {
      if (e.data?.channel !== "xxc-runtime") return;
      if (e.data.type === "frame")
        (window as any).playerTest.peak = Math.max(
          (window as any).playerTest.peak,
          e.data.peak,
        );
      if (e.data.type === "error")
        (window as any).playerTest.errors.push(e.data.message);
    });
  });
  await page.goto("/p/" + project.slug);
  await expect(
    page.getByRole("button", { name: "▶ PLAY", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".source-section details")).toHaveCount(2);
  await expect(page.locator(".source-section details[open]")).toHaveCount(0);
  await expect(page.locator(".share-particles canvas")).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.locator("iframe, video")).toHaveCount(0);
  await page.getByText("listen.strudel", { exact: true }).click();
  await expect(page.locator(".source-section details[open]")).toHaveCount(1);
  await page.getByText("listen.strudel", { exact: true }).click();
  await page.getByRole("button", { name: "▶ PLAY", exact: true }).click();
  await unlock(page);
  await expect(page.frameLocator("iframe").locator("body")).toHaveAttribute(
    "data-player",
    "true",
  );
  await expect(
    page.frameLocator("iframe").locator("#editor"),
  ).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).playerTest.peak))
    .toBeGreaterThan(0.001);
  await expect
    .poll(() => videoTime(page), { timeout: 20000 })
    .toBeGreaterThan(0.2);
  expect(
    await page
      .locator(".vj-playback video")
      .evaluateAll((videos) =>
        videos.every(
          (v) =>
            (v as HTMLVideoElement).paused || (v as HTMLVideoElement).muted,
        ),
      ),
  ).toBe(true);
  const surface = page.getByRole("region", {
    name: "Music video player",
    exact: true,
  });
  const box = await surface.boundingBox();
  expect(box?.width).toBe(1280);
  expect(box?.height).toBe(720);
  await page.getByLabel("Scene duration").selectOption("32");
  const transport = page.locator(".share-player-transport");
  await surface.click({ position: { x: 600, y: 300 } });
  await expect(transport).toHaveCSS("opacity", "0", { timeout: 5000 });
  await surface.hover({ position: { x: 500, y: 250 } });
  await expect(transport).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await expect(transport).toHaveCSS("opacity", "0");
  await page.getByLabel("Scene duration").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(transport).toHaveCSS("opacity", "1");
  const clip = await page.locator(".vj-playback").getAttribute("data-clip");
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Exit fullscreen" }),
  ).toBeVisible();
  expect(
    await surface.evaluate((node) =>
      node.contains(document.elementFromPoint(innerWidth / 2, innerHeight / 2)),
    ),
  ).toBe(true);
  expect(await page.locator(".vj-playback").getAttribute("data-clip")).toBe(
    clip,
  );
  await page.screenshot({
    path: `test-results/share-fullscreen-${test.info().project.name}.png`,
  });
  await page.getByRole("button", { name: "Exit fullscreen" }).click();
  await expect(
    page.getByRole("button", { name: "Fullscreen", exact: true }),
  ).toBeVisible();
  await surface.hover({ position: { x: 500, y: 250 } });
  await page.getByRole("button", { name: "Next VJ loop" }).click();
  await expect(page.locator(".vj-playback")).not.toHaveAttribute(
    "data-clip",
    clip!,
    { timeout: 20000 },
  );
  const beforeAutomatic = await page
    .locator(".vj-playback")
    .getAttribute("data-clip");
  await page.getByLabel("Scene duration").selectOption("2");
  await expect(page.locator(".vj-playback")).not.toHaveAttribute(
    "data-clip",
    beforeAutomatic!,
    { timeout: 10000 },
  );
  await surface.hover({ position: { x: 500, y: 250 } });
  await page.getByRole("button", { name: "Stop music" }).click();
  expect(await page.evaluate(() => (window as any).playerTest.errors)).toEqual(
    [],
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluateAll((videos) => videos.every((v) => v.paused)),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Play music", exact: true }).click();
  await unlock(page);
  await page.getByRole("button", { name: "Stop music" }).click();
  await page.reload();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator(".source-section details[open]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mobile share player supports reduced motion, window fullscreen and cancelling audio activation", async ({
  page,
  request,
}) => {
  const project = await score(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    if (window === top)
      Object.defineProperty(Element.prototype, "requestFullscreen", {
        value: undefined,
        configurable: true,
      });
  });
  await page.goto("/p/" + project.slug);
  await page.getByRole("button", { name: "▶ PLAY", exact: true }).click();
  await unlock(page);
  await expect(page.locator(".music-video-canvas")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluateAll((videos) => videos.every((v) => v.paused)),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect(page.locator(".share-player-screen")).toHaveClass(
    /window-fullscreen/,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".share-player-screen")).not.toHaveClass(
    /window-fullscreen/,
  );
  await page.getByRole("button", { name: "Pause background" }).click();
  await expect(
    page.getByRole("button", { name: "Animate background" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.locator(".share-player-screen").hover();
  await page.getByRole("button", { name: "Stop music" }).click();
  await page.getByRole("button", { name: "Play music", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator(".share-player-status")).toContainText("STOPPED");
});

test("share player reports score errors and refuses a score made private after page load", async ({
  page,
  request,
}) => {
  const project = await score(request, "missingScoreFunction()");
  await page.goto("/p/" + project.slug);
  await page.getByRole("button", { name: "▶ PLAY", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await page
          .frameLocator("iframe")
          .getByRole("button", { name: /ENABLE AUDIO/ })
          .count()) > 0 || (await page.getByRole("alert").count()) > 0,
      { timeout: 30000 },
    )
    .toBe(true);
  const enable = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await enable.count()) await enable.click();
  await expect(page.getByRole("alert")).toContainText("missingScoreFunction");
  const saved = await (
    await request.put("/api/projects/" + project.id, {
      headers: { ...headers, "X-CSRF-Token": created[0].csrf },
      data: { ...project, visibility: "private" },
    })
  ).json();
  expect(saved.ok).toBe(true);
  await page.getByRole("button", { name: "Play music", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Project not found");
  await expect(page.locator("iframe")).toHaveCount(0);
  const response = await page.goto("/p/" + project.slug);
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("button", { name: "▶ PLAY", exact: true }),
  ).toHaveCount(0);
});

test("player deeplinks honor cycle timing, remain silent and copy the selected timing", async ({
  page,
  request,
}) => {
  const project = await score(request);
  await page.addInitScript(() => {
    if (window !== top) return;
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          (window as any).copiedPlayerLink = value;
        },
      },
    });
  });
  const url = "/p/" + project.slug + "/play?cycle=1";
  const response = await page.goto(url);
  expect(response?.status()).toBe(200);
  const surface = page.getByRole("region", {
    name: "Music video player",
    exact: true,
  });
  await expect(surface).toBeInViewport();
  await expect(page.getByLabel("Scene duration")).toHaveValue("1");
  await expect(page.locator("iframe, video")).toHaveCount(0);
  await expect(page.locator(".source-section details[open]")).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://strudel.xxc.dk/p/" + project.slug,
  );
  await page.getByLabel("Scene duration").selectOption("2");
  await page.getByRole("button", { name: "Copy player link" }).click();
  expect(await page.evaluate(() => (window as any).copiedPlayerLink)).toBe(
    "https://strudel.xxc.dk/p/" + project.slug + "/play?cycle=2",
  );
  await page.getByRole("button", { name: "Play music", exact: true }).click();
  await unlock(page);
  await expect
    .poll(() => videoTime(page), { timeout: 20000 })
    .toBeGreaterThan(0.2);
  await page.getByRole("button", { name: "Stop music" }).click();
  await page.goto("/p/" + project.slug + "?cycle=32#play");
  await expect(surface).toBeInViewport();
  await expect(page.getByLabel("Scene duration")).toHaveValue("32");
  await page.goto("/p/" + project.slug + "/play?cycle=-1");
  await expect(page.getByLabel("Scene duration")).toHaveValue("8");
});
