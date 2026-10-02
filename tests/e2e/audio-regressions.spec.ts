import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page) {
  await page.addInitScript(() => {
    if (window !== top) return;
    localStorage.setItem("xxc-onboarded", "1");
    (window as any).audioTest = {
      peak: 0,
      errors: [],
      capture: null,
      recording: "inactive",
      evaluated: 0,
    };
    addEventListener("message", (e) => {
      if (e.data?.channel !== "xxc-runtime") return;
      const t = (window as any).audioTest;
      if (e.data.type === "frame") t.peak = Math.max(t.peak, e.data.peak);
      if (e.data.type === "error") t.errors.push(e.data.message);
      if (e.data.type === "recorded") t.capture = e.data.blob;
      if (e.data.type === "recording") t.recording = e.data.state;
      if (e.data.type === "evaluated") t.evaluated++;
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
}
async function send(page: Page, data: object) {
  await page.evaluate(
    (data) =>
      document
        .querySelector("iframe")!
        .contentWindow!.postMessage({ channel: "xxc-host", ...data }, "*"),
    data,
  );
}
async function load(page: Page, code: string, file = "regression.strudel") {
  await send(page, {
    type: "load",
    code,
    file,
    generation: 999,
    projectKey: "audio-regression",
  });
}
async function unlock(page: Page) {
  await page.waitForTimeout(600);
  const button = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await button.count()) await button.click();
}

test("Hush removes previous voices and effect tails before playing a different file", async ({
  page,
}) => {
  await setup(page);
  await load(
    page,
    'setcps(1)\ns("sine").freq(220).gain(.5).release(8).room(1).delay(.8).delaytime(.25)',
    "old.strudel",
  );
  await send(page, { type: "evaluate", mode: "all" });
  await unlock(page);
  await expect
    .poll(() => page.evaluate(() => (window as any).audioTest.peak))
    .toBeGreaterThan(0.001);
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /HUSH/ }).click();
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeVisible();
  await load(
    page,
    'setcps(1)\ns("~ ~ ~ sine").freq(880).attack(0).release(.02).gain(.4)',
    "new.strudel",
  );
  await send(page, { type: "record", action: "start" });
  await unlock(page);
  await expect
    .poll(() => page.evaluate(() => (window as any).audioTest.recording))
    .toBe("recording");
  await send(page, { type: "evaluate", mode: "all" });
  await page.waitForTimeout(1900);
  await send(page, { type: "record", action: "stop" });
  await expect
    .poll(() => page.evaluate(() => !!(window as any).audioTest.capture))
    .toBe(true);
  const peaks = await page.evaluate(async () => {
    const bytes = await (window as any).audioTest.capture.arrayBuffer(),
      view = new DataView(bytes);
    const rate = view.getUint32(24, true);
    let first = 0,
      later = 0;
    for (let i = 44; i + 4 <= bytes.byteLength; i += 8) {
      const seconds = (i - 44) / 8 / rate,
        value = Math.abs(view.getFloat32(i, true));
      if (seconds < 0.6) first = Math.max(first, value);
      else later = Math.max(later, value);
    }
    return { first, later };
  });
  expect(
    peaks.first,
    "initial rest must not contain the previous score",
  ).toBeLessThan(0.00001);
  expect(peaks.later, "new score plays after its rest").toBeGreaterThan(0.001);
  expect(await page.evaluate(() => (window as any).audioTest.errors)).toEqual(
    [],
  );
});

test("legacy inserted maps have an explicit undoable quote repair", async ({
  page,
}) => {
  await setup(page);
  await load(
    page,
    'samples({ recording: "https://strudel.xxc.dk/samples/tone.wav" })\n$: s("recording")\n$: n("<0 0 -1 3>").scale("D2:minor").s("recording").attack(.01).decay(.15).sustain(.7).release(.15).gain(.55)',
  );
  await send(page, { type: "evaluate", mode: "all" });
  await unlock(page);
  const frame = page.frameLocator("iframe");
  const repair = frame.getByRole("button", {
    name: "REPAIR SAMPLE MAP QUOTES & PLAY",
  });
  await expect(repair).toBeVisible();
  await expect(frame.locator(".cm-content")).toContainText(
    '"https://strudel.xxc.dk/samples/tone.wav"',
  );
  await page.evaluate(() => {
    (window as any).audioTest.errors = [];
  });
  await repair.click();
  await expect(frame.locator(".cm-content")).toContainText(
    "'https://strudel.xxc.dk/samples/tone.wav'",
  );
  await expect
    .poll(() => page.evaluate(() => (window as any).audioTest.peak))
    .toBeGreaterThan(0.001);
  expect(await page.evaluate(() => (window as any).audioTest.errors)).toEqual(
    [],
  );
  await page.getByRole("button", { name: /HUSH/ }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(frame.locator(".cm-content")).toContainText(
    '"https://strudel.xxc.dk/samples/tone.wav"',
  );
});

test("Sample Lab upload, trim, save and Insert emits playable single-quoted code", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page.frameLocator("iframe").locator(".cm-content")).toHaveText(
    "",
  );
  await page.getByRole("button", { name: "Sample Lab", exact: true }).click();
  await page
    .locator("dialog input[type=file]")
    .setInputFiles("public/samples/tone.wav");
  await page.getByLabel("Sample name", { exact: true }).fill("recording");
  await page.getByLabel("Start (s)", { exact: true }).fill("0.05");
  await page.getByLabel("End (s)", { exact: true }).fill("0.4");
  await page.getByRole("button", { name: "crop", exact: true }).click();
  await page.getByRole("button", { name: "normalize", exact: true }).click();
  await page
    .getByRole("button", { name: "Save to project", exact: true })
    .click();
  await page.getByRole("button", { name: /Insert into Strudel/ }).click();
  const editor = page.frameLocator("iframe").locator(".cm-content");
  await expect(editor).toContainText("'https://strudel.xxc.dk/media/");
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(
    '\n$: n("<0 0 -1 3>").scale("D2:minor").s("recording").attack(.01).decay(.15).sustain(.7).release(.15).gain(.55)',
  );
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await unlock(page);
  await expect
    .poll(() => page.evaluate(() => (window as any).audioTest.peak))
    .toBeGreaterThan(0.001);
  expect(await page.evaluate(() => (window as any).audioTest.errors)).toEqual(
    [],
  );
  await page.getByRole("button", { name: /HUSH/ }).click();
});

test.afterEach(async ({ page }) => {
  if (page.isClosed()) return;
  await page
    .evaluate(async () => {
      const session = await fetch("/api/session").then((r) => r.json());
      const projects = await fetch("/api/projects").then((r) => r.json());
      const headers = { "X-CSRF-Token": session.data.csrf };
      for (const project of projects.data || []) {
        if (!["Untitled project", "Redshift / 001"].includes(project.title))
          continue;
        const samples = await fetch("/api/samples").then((r) => r.json());
        for (const sample of samples.data || [])
          if (sample.project_id === project.id)
            await fetch("/api/samples/" + sample.id, {
              method: "DELETE",
              headers,
            });
        await fetch("/api/projects/" + project.id, {
          method: "DELETE",
          headers,
        });
      }
    })
    .catch(() => {});
});
