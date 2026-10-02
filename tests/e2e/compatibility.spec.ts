import { test, expect } from "@playwright/test";
import fs from "node:fs";
test("official language, visuals, wavetables, URL samples and actual master gain", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (window !== top) return;
    localStorage.setItem("xxc-onboarded", "1");
    (window as any).telemetry = {
      peak: 0,
      errors: [],
      evaluated: 0,
      events: 0,
    };
    addEventListener("message", (e) => {
      if (e.data?.channel !== "xxc-runtime") return;
      const t = (window as any).telemetry;
      if (e.data.type === "error") t.errors.push(e.data.message);
      if (e.data.type === "frame") {
        t.peak = e.data.peak;
        t.events = e.data.events.length;
      }
      if (e.data.type === "evaluated") t.evaluated++;
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  for (const score of ["core", "visuals", "wavetable", "external"]) {
    await page.evaluate(
      ({ code, score }) => {
        const frame = document.querySelector("iframe")!.contentWindow!;
        frame.postMessage(
          {
            channel: "xxc-host",
            type: "load",
            file: score + ".strudel",
            code,
            generation: 999,
            projectKey: "compatibility",
          },
          "*",
        );
        frame.postMessage(
          { channel: "xxc-host", type: "evaluate", mode: "all" },
          "*",
        );
      },
      {
        code: fs.readFileSync(
          "tests/compatibility/" + score + ".strudel",
          "utf8",
        ),
        score,
      },
    );
    await page.waitForTimeout(600);
    const unlock = page
      .frameLocator("iframe")
      .getByRole("button", { name: /ENABLE AUDIO/ });
    if (await unlock.count()) await unlock.click();
    await expect
      .poll(() => page.evaluate(() => (window as any).telemetry.peak), {
        timeout: 12000,
        message: score + " emits audio",
      })
      .toBeGreaterThan(0.001);
    await expect
      .poll(() => page.evaluate(() => (window as any).telemetry.events))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as any).telemetry.errors)).toEqual(
      [],
    );
  }
  await page.getByLabel("Master volume", { exact: true }).fill("0");
  await expect
    .poll(() => page.evaluate(() => (window as any).telemetry.peak))
    .toBeLessThan(0.00001);
  await page.getByLabel("Master volume", { exact: true }).fill("0.5");
  await expect
    .poll(() => page.evaluate(() => (window as any).telemetry.peak))
    .toBeGreaterThan(0.001);
  await page.getByRole("button", { name: /HUSH/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).telemetry.peak))
    .toBe(0);
});
test("Hydra initializes locally without runtime exceptions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (window === top) localStorage.setItem("xxc-onboarded", "1");
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.evaluate(
    (code) => {
      const frame = document.querySelector("iframe")!.contentWindow!;
      frame.postMessage(
        {
          channel: "xxc-host",
          type: "load",
          file: "hydra.strudel",
          code,
          generation: 999,
          projectKey: "compatibility",
        },
        "*",
      );
      frame.postMessage(
        { channel: "xxc-host", type: "evaluate", mode: "all" },
        "*",
      );
    },
    fs.readFileSync("tests/compatibility/hydra.strudel", "utf8"),
  );
  await page.waitForTimeout(600);
  const unlock = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await unlock.count()) await unlock.click();
  await expect(
    page.frameLocator("iframe").locator("canvas#hydra-canvas"),
  ).toHaveCount(1, { timeout: 15000 });
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
  await expect(page.locator(".error-line")).toHaveCount(0);
  await page.getByRole("button", { name: /HUSH/ }).click();
});

test("official MIDI output and clock use the trusted permission bridge", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (window !== top) return;
    localStorage.setItem("xxc-onboarded", "1");
    const messages: number[][] = [];
    (window as any).midiMessages = messages;
    (window as any).midiDiagnostics = [];
    addEventListener("message", (e) => {
      if (
        e.data?.channel === "xxc-runtime" &&
        ["midi-send", "error", "frame"].includes(e.data.type)
      ) {
        const data =
          e.data.type === "frame"
            ? { events: e.data.events, cps: e.data.cps, phase: e.data.phase }
            : e.data;
        (window as any).midiDiagnostics.push(data);
      }
    });
    const out = {
      id: "test-output",
      name: "Test Output",
      manufacturer: "Test",
      type: "output",
      state: "connected",
      connection: "open",
      send: (bytes: number[]) => messages.push(Array.from(bytes)),
      open: async () => out,
      close: async () => out,
    };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: async () => ({
        inputs: new Map(),
        outputs: new Map([["test-output", out]]),
        sysexEnabled: false,
      }),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("tab", { name: "CONTROLS", exact: true }).click();
  await page.getByRole("button", { name: "Connect MIDI", exact: true }).click();
  await expect(
    page.getByText("1 MIDI port(s) available", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Official Strudel MIDI input, output and clock connected through permission bridge.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.evaluate(() => {
    const frame = document.querySelector("iframe")!.contentWindow!;
    frame.postMessage(
      {
        channel: "xxc-host",
        type: "load",
        file: "midi.strudel",
        code: 'setcps(.5)\n$: note("c3 eb3 g3 bb3").midi(0)\n$: midicmd("clock*96").midi(0)',
        generation: 999,
        projectKey: "compatibility",
      },
      "*",
    );
    frame.postMessage(
      { channel: "xxc-host", type: "evaluate", mode: "all" },
      "*",
    );
  });
  await page.waitForTimeout(600);
  const unlock = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await unlock.count()) await unlock.click();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (window as any).midiMessages.some(
            (bytes: number[]) => (bytes[0] & 240) === 144,
          ),
        ),
      { timeout: 10000 },
    )
    .toBe(true)
    .catch(async (e) => {
      await test.info().attach("midi-diagnostics", {
        body: JSON.stringify(
          await page.evaluate(() => (window as any).midiDiagnostics),
        ),
        contentType: "application/json",
      });
      throw e;
    });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).midiMessages.some(
          (bytes: number[]) => bytes[0] === 248,
        ),
      ),
    )
    .toBe(true);
  await expect(page.locator(".error-line")).toHaveCount(0);
  await page.getByRole("button", { name: /HUSH/ }).click();
});
