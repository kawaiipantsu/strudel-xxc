import { test, expect } from "@playwright/test";

const editor = (page: any) =>
  page.frameLocator("iframe").locator(".cm-content");
const draft = (page: any) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("xxc-draft") || "null"));
async function blank(page: any) {
  await expect(editor(page)).toHaveText("");
  await expect(page.locator('.editor-tabs [role="tab"]')).toHaveCount(1);
  await expect(
    page.getByRole("tab", { name: "main.strudel", exact: true }),
  ).toBeVisible();
  const project = await draft(page);
  expect(project.title).toBe("Untitled project");
  expect(project.files).toEqual([
    { path: "main.strudel", kind: "file", content: "" },
  ]);
  expect(project.id).toBeUndefined();
  expect(project.remix_of).toBeUndefined();
  expect(project.cover_id).toBeUndefined();
  expect(project.tags).toEqual([]);
  expect(project.metadata).toEqual({});
  expect(project.visibility).toBe("private");
  expect(project.draft_id).toBeTruthy();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(editor(page)).toHaveText("");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window === top) localStorage.setItem("xxc-onboarded", "1");
  });
});

test("New preserves an in-flight save, opens a blank independent project and supports recovery", async ({
  page,
}) => {
  await page.goto("/");
  await expect(editor(page)).toContainText("REDSHIFT", { timeout: 30000 });
  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// preserve before new project");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let intercepted = false;
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "POST" && !intercepted) {
      intercepted = true;
      await gate;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.poll(() => intercepted).toBe(true);
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "New project", exact: true }),
  ).toBeDisabled();
  release();
  await blank(page);
  const firstDraft = (await draft(page)).draft_id;
  const previous = await page.evaluate(async () => {
    const list = await fetch("/api/projects").then((r) => r.json());
    const saved = list.data.find((p: any) => p.title === "Redshift / 001");
    return fetch("/api/projects/" + saved.id)
      .then((r) => r.json())
      .then((r) => r.data);
  });
  expect(
    previous.files.find((f: any) => f.path === "main.strudel").content,
  ).toContain("preserve before new project");
  await editor(page).click();
  await page.keyboard.type('s("bd*4")');
  await page.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect(page.locator(".saved-indicator")).toContainText("SAVED");
  const saved = await draft(page);
  expect(saved.id).not.toBe(previous.id);
  expect(saved.files).toHaveLength(1);
  await page.reload();
  await expect(editor(page)).toHaveText('s("bd*4")', { timeout: 30000 });
  await expect(page.locator('.editor-tabs [role="tab"]')).toHaveCount(1);
  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// recovered unsaved edit");
  await expect.poll(async () => (await draft(page)).draft_dirty).toBe(true);
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(editor(page)).toContainText("recovered unsaved edit", {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await blank(page);
  const recovered = await page.evaluate(
    async (id) =>
      fetch("/api/projects/" + id)
        .then((r) => r.json())
        .then((r) => r.data),
    saved.id,
  );
  expect(recovered.files[0].content).toContain("recovered unsaved edit");
  expect((await draft(page)).draft_id).not.toBe(firstDraft);
  await page
    .getByRole("button", { name: "Recent projects", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Redshift \/ 001/ })
    .click();
  await expect(editor(page)).toContainText("preserve before new project");
});

test("New is visible on mobile and escapes a library link across reload without changing the score", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const original = await page.evaluate(async () => {
    const list = await fetch("/api/library").then((r) => r.json());
    const p = list.data.find((p: any) => p.title === "Minimal Beat");
    return fetch("/api/projects/" + p.id)
      .then((r) => r.json())
      .then((r) => r.data);
  });
  await page.goto("/?project=" + original.id);
  await expect(editor(page)).toContainText("setcps", { timeout: 30000 });
  await expect(page.locator(".saved-indicator")).toContainText("READ ONLY");
  const newButton = page.getByRole("button", {
    name: "New project",
    exact: true,
  });
  await expect(newButton).toBeInViewport();
  let writes = 0;
  page.on("request", (req) => {
    if (req.url().includes("/api/projects") && req.method() !== "GET") writes++;
  });
  await newButton.click();
  await expect(editor(page)).toHaveText("");
  expect(writes).toBe(0);
  expect(new URL(page.url()).searchParams.has("project")).toBe(false);
  await page.reload();
  await expect(editor(page)).toHaveText("", { timeout: 30000 });
  await expect(page.locator('.editor-tabs [role="tab"]')).toHaveCount(1);
  const current = await page.evaluate(
    async (id) =>
      fetch("/api/projects/" + id)
        .then((r) => r.json())
        .then((r) => r.data),
    original.id,
  );
  expect(current.files).toEqual(original.files);
  expect(current.version).toBe(original.version);
});

test("a failed checkpoint leaves the current workspace intact", async ({
  page,
}) => {
  await page.goto("/");
  await expect(editor(page)).toContainText("REDSHIFT", { timeout: 30000 });
  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// keep me on save failure");
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          data: null,
          error: { code: "UNAVAILABLE", message: "Test save unavailable" },
        }),
      });
    else await route.continue();
  });
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(
    page.getByText(/Could not preserve the current project/),
  ).toBeVisible();
  await expect(editor(page)).toContainText("keep me on save failure");
  await expect(
    page.getByRole("tab", { name: "drums.strudel", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New project", exact: true }),
  ).toBeEnabled();
});

test.afterEach(async ({ page }) => {
  if (page.isClosed()) return;
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page
    .evaluate(async () => {
      const session = await fetch("/api/session").then((r) => r.json());
      const list = await fetch("/api/projects").then((r) => r.json());
      for (const p of list.data || [])
        await fetch("/api/projects/" + p.id, {
          method: "DELETE",
          headers: { "X-CSRF-Token": session.data.csrf },
        });
    })
    .catch(() => {});
});
