import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

test("all 29 piano recordings decode through the deployed delivery endpoint", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const response = await fetch("/sample-banks/runtime.json");
    const catalogue = await response.json();
    const piano = catalogue.collections.find((c: any) => c.id === "piano").map
      .piano;
    const context = new AudioContext();
    const decoded = [];
    try {
      for (const [note, url] of Object.entries(piano)) {
        const file = await fetch(url as string);
        if (!file.ok) throw new Error(note + ": HTTP " + file.status);
        const buffer = await context.decodeAudioData(await file.arrayBuffer());
        decoded.push({
          note,
          duration: buffer.duration,
          channels: buffer.numberOfChannels,
        });
      }
    } finally {
      await context.close();
    }
    return decoded;
  });
  expect(results).toHaveLength(29);
  expect(results.every((r) => r.duration > 1 && r.channels > 0)).toBe(true);
});

async function openStudio(page: Page) {
  await page.addInitScript(() => {
    if (window !== top) return;
    localStorage.setItem("xxc-onboarded", "1");
    (window as any).sampleTelemetry = {
      peak: 0,
      errors: [],
      events: [],
      evaluated: 0,
    };
    addEventListener("message", (e) => {
      if (e.data?.channel !== "xxc-runtime") return;
      const t = (window as any).sampleTelemetry;
      if (e.data.type === "error") t.errors.push(e.data.message);
      if (e.data.type === "evaluated") t.evaluated++;
      if (e.data.type === "frame") {
        t.peak = Math.max(t.peak, e.data.peak);
        t.events = e.data.events;
      }
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
}

async function play(page: Page, code: string) {
  await page.evaluate((code) => {
    const telemetry = (window as any).sampleTelemetry;
    telemetry.peak = 0;
    telemetry.events = [];
    telemetry.errors = [];
    telemetry.evaluated = 0;
    const frame = document.querySelector("iframe")!.contentWindow!;
    frame.postMessage(
      {
        channel: "xxc-host",
        type: "load",
        file: "samples-test.strudel",
        code,
        generation: 999,
        projectKey: "sample-verification",
      },
      "*",
    );
    frame.postMessage(
      { channel: "xxc-host", type: "evaluate", mode: "all" },
      "*",
    );
  }, code);
  await page.waitForTimeout(600);
  const unlock = page
    .frameLocator("iframe")
    .getByRole("button", { name: /ENABLE AUDIO/ });
  if (await unlock.count()) await unlock.click();
  await expect
    .poll(
      () => page.evaluate(() => (window as any).sampleTelemetry.evaluated),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as any).sampleTelemetry.peak), {
      timeout: 20000,
    })
    .toBeGreaterThan(0.0001);
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => (window as any).sampleTelemetry.errors),
  ).toEqual([]);
}

test("unchanged 909, piano and misc scores emit actual audio with local banks", async ({
  page,
}) => {
  const fetched: string[] = [];
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/sample-banks/audio/")) {
      fetched.push(r.url());
      if (!r.ok()) failures.push(r.url() + ": " + r.status());
    }
  });
  // Default banks must be independent of GitHub/CDN availability in the user's browser.
  await page.route("https://raw.githubusercontent.com/**", (r) => r.abort());
  await page.route("https://strudel.b-cdn.net/**", (r) => r.abort());
  await openStudio(page);
  for (const score of ["roland-909", "piano", "misc"]) {
    const before = fetched.length;
    await play(
      page,
      fs.readFileSync("tests/compatibility/" + score + ".strudel", "utf8"),
    );
    expect(fetched.length, score + " fetched local audio").toBeGreaterThan(
      before,
    );
    await page.getByRole("button", { name: /HUSH/ }).click();
    await page.waitForTimeout(100);
  }
  expect(failures).toEqual([]);
});

test("individual 909 voices, aliases, crackle and remaining default collections", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openStudio(page);
  for (const code of [
    ...["bd", "hh", "cp", "rim"].map((s) => `s("${s}*4").bank("RolandTR909")`),
    's("bd*4").bank("TR909")',
    's("crackle*4").density(0.03).gain(0.1)',
    's("misc*4")',
    's("casio*4")',
    's("ballwhistle*4")',
    's("ta*4").bank("mridangam")',
    'note("c3*4").s("wt_digital")',
  ]) {
    await play(page, code);
    await page.getByRole("button", { name: /HUSH/ }).click();
    await page.waitForTimeout(100);
  }
});

test("official github sample loading and the unchanged break slicing score", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("response", (r) => {
    if (
      r.ok() &&
      r
        .url()
        .startsWith(
          "https://raw.githubusercontent.com/tidalcycles/dirt-samples/",
        )
    )
      external.push(r.url());
  });
  await openStudio(page);
  await play(
    page,
    fs.readFileSync("tests/compatibility/github-samples.strudel", "utf8"),
  );
  expect(external.some((u) => u.endsWith("strudel.json"))).toBe(true);
  await page.getByRole("button", { name: /HUSH/ }).click();
});

test("sample search, preview, favorites and insertion use the complete catalogue", async ({
  page,
}) => {
  await openStudio(page);
  await page.getByRole("tab", { name: "SAMPLES", exact: true }).click();
  await page.getByLabel("Search samples").fill("RolandTR909_bd");
  const banks = page.getByRole("region", {
    name: "Installed Strudel sample banks",
  });
  await expect(
    banks.getByText("RolandTR909_bd", { exact: true }),
  ).toBeVisible();
  const request = page.waitForResponse(
    (r) => r.url().includes("/sample-banks/audio/") && r.ok(),
  );
  await page
    .getByRole("button", { name: "Preview RolandTR909_bd", exact: true })
    .click();
  await request;
  await page
    .getByRole("button", { name: "Favorite RolandTR909_bd", exact: true })
    .click();
  await page.getByRole("button", { name: "Show favorite samples" }).click();
  await expect(
    banks.getByText("RolandTR909_bd", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Insert RolandTR909_bd", exact: true })
    .click();
  await expect(
    page.frameLocator("iframe").locator(".cm-content"),
  ).toContainText('s("RolandTR909_bd")');
  await page.getByRole("button", { name: "Show favorite samples" }).click();
  await page.getByLabel("Search samples").fill("piano");
  await page.getByLabel("Sample collection").selectOption("piano");
  await expect(banks.getByText("piano", { exact: true })).toBeVisible();
  await expect(banks.getByText(/Alexander Holm/)).toBeVisible();
});

test("default General MIDI piano and finger bass register and emit real audio", async ({
  page,
}) => {
  await openStudio(page);
  for (const code of [
    'note("c4 e4 g4 b4").s("gm_piano").gain(.5)',
    'note("c2 e2 g2 b2").s("gm_electric_bass_finger").gain(.6)',
  ]) {
    await play(page, code);
    await page.getByRole("button", { name: "HUSH", exact: true }).click();
  }
  await play(
    page,
    fs.readFileSync("tests/compatibility/general-midi.strudel", "utf8"),
  );
  await page.getByRole("button", { name: "HUSH", exact: true }).click();
});
