import { test, expect } from "@playwright/test";
const request = {
  people: 4,
  duration: 60,
  earliest: 14,
  latest: 20,
  amenities: ["Whiteboard"],
  school: "usc",
  date: "2026-11-15",
};
test("desktop discovery, planning and persistent replanning", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find your room to think." }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Find a space", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("BEST FEASIBLE FIT")).toBeVisible();
  const before = await dialog.locator(".plan-option h3").first().textContent();
  await dialog
    .getByRole("button", { name: "Simulate best room becoming unavailable" })
    .click();
  await expect(
    dialog.getByRole("heading", {
      name: "A change of plans. Still a great fit.",
    }),
  ).toBeVisible();
  expect(
    await dialog.locator(".plan-option h3").first().textContent(),
  ).not.toBe(before);
  await page.screenshot({
    path: "docs/screenshots/replanning.png",
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "My plans", exact: true }).click();
  await expect(
    page.getByText("DEMO · replanned", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "My plans", exact: true }).click();
  await expect(
    page.getByText("DEMO · replanned", { exact: true }),
  ).toBeVisible();
});
test("mobile usability and map view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: false,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Map view" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/map.png", fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Group planner", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Get everyone in the room." }),
  ).toBeVisible();
});
test("API ownership, honest live mode, release order, alerts and shareable groups", async ({
  request: client,
  playwright,
}) => {
  const call = async (action: string, data: object = {}) => {
    const r = await client.post("/api/engine", { data: { action, ...data } });
    expect(r.ok()).toBeTruthy();
    return r.json();
  };
  const p = await call("plan", { request, mode: "demo" });
  expect(p.matches.length).toBeGreaterThan(0);
  const other = await playwright.request.newContext({
    baseURL: "http://localhost:3000",
  });
  const denied = await other.post("/api/engine", {
    data: { action: "replan", id: p.id },
  });
  expect(denied.status()).toBe(400);
  const live = await call("plan", { request, mode: "live" });
  expect(live.matches).toHaveLength(0);
  expect(live.status).toBe("no_match");
  const premature = await client.post("/api/engine", {
    data: { action: "release_verify", id: "invalid" },
  });
  expect(premature.ok()).toBeFalsy();
  const release = await call("release", { roomId: "leavey-203" });
  const skipped = await client.post("/api/engine", {
    data: { action: "release_verify", id: release.id },
  });
  expect(skipped.ok()).toBeFalsy();
  await call("release_cancelled", { id: release.id, attest: true });
  const verified = await call("release_verify", { id: release.id });
  expect(verified.status).toBe("demo_availability_verified");
  const noConsent = await client.post("/api/engine", {
    data: { action: "watch", request, mode: "demo", consent: false },
  });
  expect(noConsent.ok()).toBeFalsy();
  const w = await call("watch", { request, mode: "demo", consent: true });
  await call("watch_check", { id: w.id });
  await call("delete_watch", { id: w.id });
  const g = await call("group_create", {
    title: "Our study group",
    date: request.date,
  });
  const responses = await Promise.all(
    ["Alex", "Sam"].map((name) =>
      other.post("/api/engine", {
        data: {
          action: "group_join",
          id: g.id,
          member: { name, start: 14, end: 18 },
        },
      }),
    ),
  );
  expect(responses.every((r) => r.ok())).toBeTruthy();
  const shared = await call("group_read", { id: g.id });
  expect(shared.members).toHaveLength(2);
  await other.dispose();
  const forged = await client.post("/api/engine", {
    headers: { origin: "https://example.com" },
    data: { action: "state" },
  });
  expect(forged.status()).toBe(403);
});

test("interprets a request, collects group availability and creates a real invite", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Describe your ideal room" })
    .fill("4 people, whiteboard, 60 minutes, from 2 to 5 pm");
  await page.getByRole("button", { name: "Interpret room request" }).click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByRole("heading", { name: "Your ideal study session." }),
  ).toBeVisible();
  await expect(d.getByLabel("Earliest start")).toHaveValue("14");
  await expect(d.getByLabel("Latest end")).toHaveValue("17");
  await page.keyboard.press("Escape");
  await expect(d).not.toBeVisible();
  await page.getByRole("button", { name: "Plan with friends" }).click();
  await d.getByLabel("Your name").fill("Alex");
  await d.getByRole("button", { name: "Add availability" }).click();
  await expect(d.getByText("Alex", { exact: true })).toBeVisible();
  await d.getByRole("button", { name: "Create a shareable group" }).click();
  const link = await d
    .getByRole("textbox", { name: "Group invite link" })
    .inputValue();
  const context = await browser.newContext();
  const friend = await context.newPage();
  await friend.goto(link);
  const fd = friend.getByRole("dialog");
  await expect(fd.getByText("Alex", { exact: true })).toBeVisible();
  await fd.getByLabel("Your name").fill("Sam");
  await fd.getByRole("button", { name: "Add availability" }).click();
  await expect(fd.getByText("Sam", { exact: true })).toBeVisible();
  await context.close();
  await d.getByRole("button", { name: "Refresh crew" }).click();
  await expect(d.getByText("Sam", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/group.png" });
});

test("watch opt-in and ordered release work in the interface", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Cancellation watch", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create a watch", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByRole("button", { name: "Create demo watch" }),
  ).toBeDisabled();
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Create demo watch" }).click();
  await expect(d).not.toBeVisible();
  await page.getByRole("button", { name: "Simulate opening" }).click();
  await expect(page.getByText("DEMO OPENING", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Release a room", exact: true })
    .click();
  await d.getByRole("button", { name: "Start demo release" }).click();
  await expect(
    d.getByRole("button", { name: "Record cancellation step" }),
  ).toBeDisabled();
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Record cancellation step" }).click();
  await expect(
    d.getByText("awaiting availability verification", { exact: true }),
  ).toBeVisible();
  await d
    .getByRole("button", { name: "Simulate provider availability check" })
    .click();
  await expect(
    d.getByText("demo availability verified", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/release.png" });
});
