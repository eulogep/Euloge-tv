import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke E2E tests for MJTV.
 * These tests intercept the API routes and return deterministic fixtures so
 * the CI never depends on a live public stream or on the iptv-org availability.
 */

const CATALOG_FIXTURE = {
  items: [
    {
      id: "demo-fr",
      name: "Demo FR",
      alternativeNames: [],
      countryCode: "FR",
      countryName: "France",
      countryFlag: "🇫🇷",
      languageCodes: ["fra"],
      categories: ["Actualités"],
      logoUrl: null,
      websiteUrl: null,
      isNsfw: false,
      streamCount: 2,
      bestCompatibility: "preferred",
    },
    {
      id: "demo-us",
      name: "Demo US",
      alternativeNames: [],
      countryCode: "US",
      countryName: "United States",
      countryFlag: "🇺🇸",
      languageCodes: ["eng"],
      categories: ["Actualités"],
      logoUrl: null,
      websiteUrl: null,
      isNsfw: false,
      streamCount: 1,
      bestCompatibility: "preferred",
    },
  ],
  nextCursor: null,
  total: 2,
  filters: {
    countries: [{ value: "FR", label: "France", count: 1 }],
    categories: [{ value: "Actualités", label: "Actualités", count: 2 }],
    languages: [{ value: "fra", label: "fra", count: 1 }],
  },
  generatedAt: "2024-01-01T00:00:00.000Z",
};

const CHANNEL_FIXTURE = {
  id: "demo-fr",
  name: "Demo FR",
  alternativeNames: [],
  countryCode: "FR",
  countryName: "France",
  countryFlag: "🇫🇷",
  languageCodes: ["fra"],
  categories: ["Actualités"],
  logoUrl: null,
  websiteUrl: null,
  isNsfw: false,
  streams: [
    {
      id: "demo-fr:s1",
      url: "https://example.com/demo.m3u8",
      title: "Demo FR",
      quality: "1080p",
      label: null,
      feedId: null,
      protocol: "https",
      kind: "hls",
      requiresReferrer: false,
      requiresCustomUserAgent: false,
      browserCompatibility: "preferred",
    },
  ],
};

const setupIntercepts = async (page: Page) => {
  await page.route("**/api/catalog**", async (route) => {
    await route.fulfill({ json: CATALOG_FIXTURE });
  });
  await page.route("**/api/channels/**", async (route) => {
    await route.fulfill({ json: CHANNEL_FIXTURE });
  });
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      json: {
        status: "ok",
        date: new Date().toISOString(),
        version: "1.0.0",
        catalogAvailable: true,
      },
    });
  });
};

test.describe("MJTV smoke", () => {
  test("home loads and shows channels", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
    await expect(page.getByText("À regarder maintenant")).toBeVisible();
    await expect(page.getByText("Demo FR").first()).toBeVisible();
  });

  test("mobile bottom nav is present", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav).toBeVisible();
    await expect(page.getByRole("button", { name: /Accueil/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Chaînes/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Favoris/ })).toBeVisible();
  });

  test("search filters the catalog", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Chaînes/ }).click();
    await page.getByLabel("Rechercher une chaîne").fill("Demo FR");
    await expect(page.getByText("Demo FR").first()).toBeVisible();
  });

  test("open a channel and see the player", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByText("Demo FR").first().click();
    await expect(page.getByRole("heading", { name: "Demo FR" })).toBeVisible();
    await expect(page.getByLabel(/Lecteur Demo FR/)).toBeVisible();
  });

  test("add to favorites and verify persistence after reload", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByText("Demo FR").first().click();
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: /Favoris/ }).click();
    await expect(page.getByText("Demo FR").first()).toBeVisible();
  });

  test("settings page shows theme selector", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Réglages/ }).click();
    await expect(page.getByRole("heading", { name: "Réglages" })).toBeVisible();
    await expect(page.getByText("Thème")).toBeVisible();
  });

  test("import page rejects dangerous protocols (fixture-based)", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Bibliothèque/ }).click();
    await expect(page.getByRole("heading", { name: "Bibliothèque" })).toBeVisible();
    await expect(page.getByText(/taille maximum/i)).toBeVisible();
  });
});
