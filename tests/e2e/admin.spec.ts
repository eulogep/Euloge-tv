import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { AdminSnapshot } from "../../src/features/admin/domain/types";

const AUTHORIZATION = `Basic ${Buffer.from("playwright-admin:playwright-only-password").toString("base64")}`;

const SNAPSHOT: AdminSnapshot = {
  generatedAt: "2026-08-09T12:00:00.000Z",
  stats: {
    totalChannels: 2,
    openableChannels: 1,
    featureableChannels: 1,
    recommendableChannels: 1,
    unavailableChannels: 0,
    degradedChannels: 0,
    offlineChannels: 1,
    archivedChannels: 0,
    channelsWithoutUsableSource: 1,
    epgAvailable: 1,
    epgStale: 0,
    epgUnavailable: 1,
    countries: 2,
    languages: 2,
    categories: 2,
  },
  channels: [
    {
      id: "demo-fr",
      name: "Démo France",
      logoUrl: null,
      countryCode: "FR",
      countryName: "France",
      languageCodes: ["fra"],
      categories: ["news"],
      sourceCount: 1,
      canOpen: true,
      canFeature: true,
      canRecommend: true,
      health: "healthy",
      operationalHealth: "ONLINE",
      checkedAt: "2026-08-09T12:00:00.000Z",
      lastSuccessAt: "2026-08-09T12:00:00.000Z",
      lastFailureAt: null,
      failureCount: 0,
      healthReasonCode: "recent_playable_source",
      epgStatus: "available",
      epgProvider: "Fixture EPG Playwright",
      epgMapping: "fixture:demo-fr",
      currentProgram: {
        title: "Journal",
        startAt: "2026-08-09T12:00:00.000Z",
        endAt: "2026-08-09T12:30:00.000Z",
      },
      nextProgram: {
        title: "Météo",
        startAt: "2026-08-09T12:30:00.000Z",
        endAt: "2026-08-09T13:00:00.000Z",
      },
      laterPrograms: [],
      archived: false,
    },
    {
      id: "offline-us",
      name: "Offline US",
      logoUrl: null,
      countryCode: "US",
      countryName: "United States",
      languageCodes: ["eng"],
      categories: ["sports"],
      sourceCount: 0,
      canOpen: false,
      canFeature: false,
      canRecommend: false,
      health: "no_source",
      operationalHealth: "OFFLINE",
      checkedAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      failureCount: 0,
      healthReasonCode: "no_enabled_source",
      epgStatus: "unavailable",
      epgProvider: null,
      epgMapping: null,
      currentProgram: null,
      nextProgram: null,
      laterPrograms: [],
      archived: false,
    },
  ],
  sources: [
    {
      id: "demo-fr:source:1",
      channelId: "demo-fr",
      channelName: "Démo France",
      displayUrl: "https://example.com/live.m3u8?[redacted]",
      kind: "hls",
      priority: 10,
      eligible: true,
      health: "playable",
      operationalHealth: "ONLINE",
      lastCheckedAt: "2026-08-09T12:00:00.000Z",
      lastSuccessAt: "2026-08-09T12:00:00.000Z",
      lastFailureAt: null,
      failureReason: null,
      mime: "application/vnd.apple.mpegurl",
    },
  ],
  options: {
    countries: ["FR", "US"],
    languages: ["eng", "fra"],
    categories: ["news", "sports"],
    health: ["healthy", "no_source"],
    epg: ["available", "unavailable"],
  },
};

const authorizedPage = async (
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> => {
  const context = await browser.newContext({ extraHTTPHeaders: { Authorization: AUTHORIZATION } });
  const page = await context.newPage();
  await page.route("**/api/admin/snapshot", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SNAPSHOT) }),
  );
  return { context, page };
};

test("admin fails closed without authorization", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(401);
  await expect(page.getByText("Authorization required")).toBeVisible();
});

test("admin API also fails closed without authorization", async ({ request }) => {
  const response = await request.get("/api/admin/snapshot");
  expect(response.status()).toBe(401);
});

test("dashboard and catalog inspection routes remain read-only", async ({ browser }) => {
  const { context, page } = await authorizedPage(browser);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Total channels")).toBeVisible();
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();

  await page.goto("/admin/channels");
  await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Rechercher une chaîne" }).fill("offline");
  await expect(page.getByText("Offline US", { exact: true })).toBeVisible();
  await expect(page.getByText("Démo France", { exact: true })).toBeHidden();

  await page.goto("/admin/sources");
  await expect(
    page.getByText("https://example.com/live.m3u8?[redacted]", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("secret");

  await page.goto("/admin/epg");
  await expect(page.getByText("Fixture EPG Playwright")).toBeVisible();
  await expect(page.getByText("Journal", { exact: true })).toBeVisible();

  await page.goto("/admin/health");
  await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
  await expect(page.getByText("ONLINE", { exact: true })).toBeVisible();
  await expect(page.getByText("OFFLINE", { exact: true })).toBeVisible();
  await context.close();
});

test("reports reads only current-browser local reports", async ({ browser }) => {
  const { context, page } = await authorizedPage(browser);
  await page.addInitScript(() => {
    localStorage.setItem(
      "mjtv:source-reports:v1",
      JSON.stringify({
        version: 1,
        reports: [
          {
            id: "report-1",
            channelId: "demo-fr",
            reason: "unstable_source",
            createdAt: "2026-08-09T12:00:00.000Z",
            appVersion: "1.0.0",
            browserFamily: "safari",
            healthStatus: "degraded",
            message: "Coupures observées",
          },
        ],
      }),
    );
  });
  await page.goto("/admin/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByText("Coupures observées")).toBeVisible();
  await expect(page.getByRole("button", { name: /delete|resolve|edit/i })).toHaveCount(0);
  await context.close();
});

test("admin remains keyboard-usable without global overflow at approved widths", async ({
  browser,
}) => {
  const { context, page } = await authorizedPage(browser);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/admin/channels");
    await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await context.close();
});
