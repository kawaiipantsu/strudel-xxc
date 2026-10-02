import { test, expect } from "@playwright/test";

test("background preference preserves real audio without page timers and hush never resumes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (window === top) {
      localStorage.setItem("xxc-onboarded", "1");
      (window as any).capture = null;
      (window as any).runtimeErrors = [];
      addEventListener("message", (e) => {
        if (e.data?.channel !== "xxc-runtime") return;
        if (e.data.type === "recorded") (window as any).capture = e.data.blob;
        if (e.data.type === "error")
          (window as any).runtimeErrors.push(e.data.message);
      });
    }
    // Model visibility and heavily throttled page timers independently of audio.
    // This checks app behavior; it does not emulate iOS OS-level suspension.
    (window as any).testHidden = false;
    Object.defineProperty(document, "hidden", {
      get: () => (window as any).testHidden,
    });
    Object.defineProperty(document, "visibilityState", {
      get: () => ((window as any).testHidden ? "hidden" : "visible"),
    });
    const interval = window.setInterval.bind(window);
    window.setInterval = ((callback: Function, ms?: number, ...args: any[]) =>
      interval(() => {
        if (!(window as any).testHidden) callback(...args);
      }, ms)) as typeof window.setInterval;
  });
  await page.goto("/");
  const editor = page.frameLocator("iframe");
  const runtime = () =>
    page.frames().find((f) => f.url().includes("/sandbox/"))!;
  const visibility = async (hidden: boolean) => {
    await runtime().evaluate((value) => {
      (window as any).testHidden = value;
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  };
  const send = async (message: object) =>
    page.evaluate((data) => {
      document
        .querySelector("iframe")!
        .contentWindow!.postMessage({ channel: "xxc-host", ...data }, "*");
    }, message);
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  const preference = page.getByRole("checkbox", {
    name: "Allow background music",
    exact: true,
  });
  await expect(preference).toBeChecked();
  await preference.uncheck();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(preference).not.toBeChecked();
  await preference.check();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await send({
    type: "load",
    file: "background.strudel",
    projectKey: "background-test",
    generation: 999,
    code: 'setcps(1)\nnote("c3 e3 g3 b3").s("sine").fast(2).attack(0).decay(.02).sustain(.5).release(.03).gain(.4)',
  });
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page.waitForTimeout(600);
  const unlock = editor.getByRole("button", { name: /ENABLE AUDIO/ });
  if (await unlock.count()) await unlock.click();
  await expect(
    page.getByRole("button", { name: "PLAYING", exact: true }),
  ).toBeVisible();
  const sessionType = await runtime().evaluate(
    () => (navigator as any).audioSession?.type,
  );
  if (sessionType !== undefined) expect(sessionType).toBe("playback");
  await send({ type: "record", action: "start" });
  await expect(page.locator(".record-button.active")).toBeVisible();
  await visibility(true);
  await page.waitForTimeout(3000);
  await send({ type: "record", action: "stop" });
  await expect
    .poll(() => page.evaluate(() => !!(window as any).capture))
    .toBe(true);
  // Require non-silent samples well beyond Strudel's 300 ms scheduling horizon.
  const peaks = await page.evaluate(async () => {
    const buffer = await (window as any).capture.arrayBuffer();
    const data = new DataView(buffer);
    const rate = data.getUint32(24, true);
    return [1, 1.5, 2, 2.5].map((seconds) => {
      let peak = 0;
      for (
        let frame = Math.floor(seconds * rate);
        frame < (seconds + 0.25) * rate;
        frame++
      ) {
        const at = 44 + frame * 8;
        if (at + 4 <= data.byteLength)
          peak = Math.max(peak, Math.abs(data.getFloat32(at, true)));
      }
      return peak;
    });
  });
  expect(
    peaks.every((peak) => peak > 0.001),
    JSON.stringify(peaks),
  ).toBe(true);
  await visibility(false);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await preference.uncheck();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await visibility(true);
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeVisible();
  await visibility(false);
  await page.waitForTimeout(300);
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeVisible();
  // Hush also remains final with background mode on.
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await preference.check();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "PLAYING", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /HUSH/ }).click();
  await visibility(true);
  await visibility(false);
  await page.waitForTimeout(300);
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).runtimeErrors)).toEqual([]);
  expect(errors).toEqual([]);
});
