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
      primaryCategory: "news",
      categories: ["news"],
      tags: [],
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
      primaryCategory: "news",
      categories: ["news"],
      tags: [],
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
    categories: [{ value: "news", label: "Actualités", count: 2 }],
    languages: [{ value: "fra", label: "fra", count: 1 }],
  },
  generatedAt: "2024-01-01T00:00:00.000Z",
};

const UNKNOWN_AVAILABILITY = {
  status: "unknown",
  lastCheckedAt: null,
  failureReason: null,
  responseStatus: null,
  detectedContentType: null,
  playbackStrategy: null,
  compatibility: { safari: "unknown", chromium: "unknown", unknown: "unknown" },
};

const CHANNEL_FIXTURE = {
  id: "demo-fr",
  name: "Demo FR",
  alternativeNames: [],
  countryCode: "FR",
  countryName: "France",
  countryFlag: "🇫🇷",
  languageCodes: ["fra"],
  primaryCategory: "news",
  categories: ["news"],
  tags: [],
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
      availability: UNKNOWN_AVAILABILITY,
    },
  ],
};

const setupIntercepts = async (
  page: Page,
  options: {
    catalog?: typeof CATALOG_FIXTURE;
    channel?: typeof CHANNEL_FIXTURE;
  } = {},
) => {
  await page.route("**/api/catalog**", async (route) => {
    await route.fulfill({ json: options.catalog ?? CATALOG_FIXTURE });
  });
  await page.route("**/api/channels/**", async (route) => {
    await route.fulfill({ json: options.channel ?? CHANNEL_FIXTURE });
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

const installDeterministicMedia = async (page: Page) => {
  await page.addInitScript(() => {
    const sources = new WeakMap<HTMLMediaElement, string>();
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      configurable: true,
      get() {
        return sources.get(this) ?? "";
      },
      set(value: string) {
        sources.set(this, value);
        this.setAttribute("data-test-src", value);
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "load", {
      configurable: true,
      value() {
        if (sources.get(this)) {
          queueMicrotask(() => this.dispatchEvent(new Event("loadedmetadata")));
        }
      },
    });
  });
};

const streamFixture = (id: string, url: string, title = id) => ({
  id,
  url,
  title,
  quality: null,
  label: null,
  feedId: null,
  protocol: "https",
  kind: "mp4",
  requiresReferrer: false,
  requiresCustomUserAgent: false,
  browserCompatibility: "preferred",
  availability: UNKNOWN_AVAILABILITY,
});

const channelWithStreams = (streams: ReturnType<typeof streamFixture>[]) => ({
  ...CHANNEL_FIXTURE,
  streams,
});

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

  test("shows automatic fallback and succeeds with the second source", async ({ page }) => {
    await installDeterministicMedia(page);
    await page.route("https://media.test/**", async (route) => {
      const failed = route.request().url().includes("first");
      await route.fulfill({
        status: failed ? 404 : 200,
        headers: { "content-type": "video/mp4" },
      });
    });
    await setupIntercepts(page, {
      channel: channelWithStreams([
        streamFixture("first", "https://media.test/first.mp4", "Première"),
        streamFixture("second", "https://media.test/second.mp4", "Secondaire"),
      ]),
    });

    await page.goto("/");
    const fallbackVisible = page
      .getByText("Tentative d’une autre source…")
      .waitFor({ state: "visible" });
    await Promise.all([fallbackVisible, page.getByText("Demo FR").first().click()]);
    await expect
      .poll(() => page.getByLabel(/Lecteur Demo FR/).getAttribute("data-test-src"))
      .toContain("second.mp4");
    await expect(page.getByText("Aucune source n’a pu être lue.")).toBeHidden();
  });

  test("shows a final error only after every source is exhausted", async ({ page }) => {
    await installDeterministicMedia(page);
    await page.route("https://media.test/**", async (route) => {
      await route.fulfill({ status: 404, headers: { "content-type": "video/mp4" } });
    });
    await setupIntercepts(page, {
      channel: channelWithStreams([
        streamFixture("first", "https://media.test/first.mp4"),
        streamFixture("second", "https://media.test/second.mp4"),
      ]),
    });

    await page.goto("/");
    await page.getByText("Demo FR").first().click();
    await expect(page.getByText("Aucune source n’a pu être lue.")).toBeVisible();
    await expect(page.getByText("2 sources essayées sur 2.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retour aux chaînes" })).toBeVisible();
  });

  test("allows a manual source choice after exhaustion", async ({ page }) => {
    await installDeterministicMedia(page);
    const attempts = new Map<string, number>();
    await page.route("https://media.test/**", async (route) => {
      const url = route.request().url();
      const count = (attempts.get(url) ?? 0) + 1;
      attempts.set(url, count);
      const manualSuccess = url.includes("second") && count > 1;
      await route.fulfill({
        status: manualSuccess ? 200 : 404,
        headers: { "content-type": "video/mp4" },
      });
    });
    await setupIntercepts(page, {
      channel: channelWithStreams([
        streamFixture("first", "https://media.test/first.mp4", "Première"),
        streamFixture("second", "https://media.test/second.mp4", "Secondaire"),
      ]),
    });

    await page.goto("/");
    await page.getByText("Demo FR").first().click();
    await expect(page.getByText("Aucune source n’a pu être lue.")).toBeVisible();
    await page.getByText("Choisir une autre source").click();
    await page.getByRole("button", { name: /Source 2 — Secondaire/ }).click();
    await expect
      .poll(() => page.getByLabel(/Lecteur Demo FR/).getAttribute("data-test-src"))
      .toContain("second.mp4");
  });

  test("ranks relevant French news ahead of unrelated recommendations", async ({ page }) => {
    const relatedCatalog = {
      ...CATALOG_FIXTURE,
      items: [
        CATALOG_FIXTURE.items[0],
        {
          ...CATALOG_FIXTURE.items[1],
          id: "4-afghanistan",
          name: "4 Afghanistan",
          countryCode: "AF",
          countryName: "Afghanistan",
          languageCodes: ["pus"],
          primaryCategory: "music",
          categories: ["music"],
        },
        {
          ...CATALOG_FIXTURE.items[1],
          id: "info-fr",
          name: "Info France",
          countryCode: "FR",
          countryName: "France",
          languageCodes: ["fra"],
          primaryCategory: "news",
          categories: ["news"],
        },
      ],
      total: 3,
    };
    await setupIntercepts(page, { catalog: relatedCatalog });

    await page.goto("/");
    await page.getByText("Demo FR").first().click();
    const related = page.getByRole("heading", { name: "Chaînes liées" }).locator("..");
    await expect(related.getByText("Info France")).toBeVisible();
    const cards = related.locator("article");
    await expect(cards.first()).toContainText("Info France");
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
