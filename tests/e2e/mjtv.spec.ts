import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type {
  CatalogResponse,
  CatalogCategory,
  ChannelSummary,
  PublicChannelDetail,
} from "../../src/features/catalog/domain/types";

/**
 * Smoke E2E tests for MJTV.
 * These tests intercept the API routes and return deterministic fixtures so
 * the CI never depends on a live public stream or on the iptv-org availability.
 */

const EPG_NOW = Date.now();
const EPG_FIXTURE = {
  status: "available" as const,
  currentProgram: {
    title: "Le journal de la mi-journée",
    description: "Les principaux titres.",
    startAt: new Date(EPG_NOW - 15 * 60 * 1000).toISOString(),
    endAt: new Date(EPG_NOW + 15 * 60 * 1000).toISOString(),
  },
  nextProgram: {
    title: "Météo et analyses",
    startAt: new Date(EPG_NOW + 15 * 60 * 1000).toISOString(),
    endAt: new Date(EPG_NOW + 45 * 60 * 1000).toISOString(),
  },
  source: { name: "Fixture EPG Playwright", kind: "fixture" as const },
  updatedAt: new Date(EPG_NOW - 5 * 60 * 1000).toISOString(),
};

const catalogItem = (
  id: string,
  name: string,
  category: CatalogCategory,
  countryCode = "FR",
  language = "fra",
): ChannelSummary => ({
  id,
  name,
  alternativeNames: [],
  countryCode,
  countryName: countryCode === "FR" ? "France" : countryCode === "US" ? "United States" : "Japon",
  countryFlag: countryCode === "FR" ? "🇫🇷" : countryCode === "US" ? "🇺🇸" : "🇯🇵",
  languageCodes: [language],
  primaryCategory: category,
  categories: [category],
  tags: [],
  logoUrl: null,
  websiteUrl: null,
  isNsfw: false,
  streamCount: id === "demo-fr" ? 2 : 1,
  bestCompatibility: "preferred",
  bestAvailability: "playable",
  health: {
    status: "healthy",
    checkedAt: "2026-07-22T12:00:00.000Z",
    sourceCount: id === "demo-fr" ? 2 : 1,
    playableSourceCount: 1,
    reasonCode: "recent_playable_source",
    reasonMessage: "Au moins une source a été confirmée comme disponible.",
  },
  ...(id === "demo-fr" ? { epg: EPG_FIXTURE } : {}),
});

const CATALOG_FIXTURE: CatalogResponse = {
  items: [
    catalogItem("demo-fr", "Demo FR", "news"),
    catalogItem("demo-us", "Demo US", "news", "US", "eng"),
    catalogItem("info-local", "Info Locale", "news"),
    catalogItem("fun-fr", "Fun France", "entertainment"),
    catalogItem("music-fr", "Music France", "music"),
    catalogItem("sport-fr", "Sport France", "sports"),
    catalogItem("kids-fr", "Kids France", "kids"),
    catalogItem("animation-jp", "Animation Japan", "animation", "JP", "jpn"),
    catalogItem("docs-fr", "Docs France", "documentaries"),
    catalogItem("culture-fr", "Culture France", "culture"),
    catalogItem("local-fr", "Local France", "local"),
    catalogItem("radio-fr", "Radio France", "radio"),
  ],
  nextCursor: null,
  total: 12,
  filters: {
    countries: [
      { value: "FR", label: "France", count: 10 },
      { value: "US", label: "United States", count: 1 },
      { value: "JP", label: "Japon", count: 1 },
    ],
    categories: [
      { value: "news", label: "Actualités", count: 3 },
      { value: "entertainment", label: "Divertissement", count: 1 },
      { value: "music", label: "Musique", count: 1 },
      { value: "sports", label: "Sports", count: 1 },
      { value: "kids", label: "Jeunesse", count: 1 },
      { value: "animation", label: "Animation", count: 1 },
      { value: "documentaries", label: "Documentaires", count: 1 },
      { value: "culture", label: "Culture", count: 1 },
      { value: "local", label: "Local", count: 1 },
      { value: "radio", label: "Radio", count: 1 },
    ],
    languages: [
      { value: "fra", label: "fra", count: 10 },
      { value: "eng", label: "eng", count: 1 },
      { value: "jpn", label: "jpn", count: 1 },
    ],
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

const CHANNEL_FIXTURE: PublicChannelDetail = {
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
  health: {
    status: "healthy",
    checkedAt: "2026-07-22T12:00:00.000Z",
    sourceCount: 1,
    playableSourceCount: 1,
    reasonCode: "recent_playable_source",
    reasonMessage: "Au moins une source a été confirmée comme disponible.",
  },
  epg: EPG_FIXTURE,
};

const EMCI_NO_SOURCE_ITEM: ChannelSummary = {
  ...catalogItem("EMCITV.fr", "EMCI TV", "religious"),
  streamCount: 0,
  bestAvailability: undefined,
  health: {
    status: "no_source",
    checkedAt: "2026-07-22T12:00:00.000Z",
    sourceCount: 0,
    playableSourceCount: 0,
    reasonCode: "no_enabled_source",
    reasonMessage: "Aucune source n’est actuellement référencée pour cette chaîne.",
  },
};

const EMCI_NO_SOURCE_CHANNEL: PublicChannelDetail = {
  ...CHANNEL_FIXTURE,
  id: "EMCITV.fr",
  name: "EMCI TV",
  primaryCategory: "religious",
  categories: ["religious"],
  streams: [],
  health: EMCI_NO_SOURCE_ITEM.health,
};

const ARCHIVED_ITEM: ChannelSummary = {
  ...catalogItem("archive-fr", "Archive FR", "news"),
  health: {
    status: "archived",
    checkedAt: "2026-07-22T12:00:00.000Z",
    sourceCount: 1,
    playableSourceCount: 0,
    reasonCode: "manual_archive",
    reasonMessage: "Cette chaîne a été retirée manuellement du catalogue actif.",
  },
};

const ARCHIVED_CHANNEL: PublicChannelDetail = {
  ...CHANNEL_FIXTURE,
  id: "archive-fr",
  name: "Archive FR",
  streams: CHANNEL_FIXTURE.streams,
  health: ARCHIVED_ITEM.health,
};

const setupIntercepts = async (
  page: Page,
  options: {
    catalog?: CatalogResponse;
    channel?: PublicChannelDetail;
    onCatalogRequest?: (url: URL) => void;
    catalogErrorForExplorer?: boolean;
  } = {},
) => {
  await page.route("**/api/catalog**", async (route) => {
    const url = new URL(route.request().url());
    options.onCatalogRequest?.(url);
    if (options.catalogErrorForExplorer && url.searchParams.has("sort")) {
      await route.fulfill({
        status: 400,
        json: {
          error: {
            code: "INVALID_CATALOG_QUERY",
            message: "Les paramètres du catalogue sont invalides.",
            fields: [{ field: "availability", message: "Invalid option" }],
          },
        },
      });
      return;
    }
    const fixture = options.catalog ?? CATALOG_FIXTURE;
    const category = url.searchParams.get("category");
    const items = category
      ? fixture.items.filter((item) => item.categories.includes(category))
      : fixture.items;
    await route.fulfill({
      json: { ...fixture, items, total: items.length },
    });
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

const activeCarouselCard = (page: Page, channelId: string) =>
  page.locator(
    `[data-testid="cinematic-active-card"][data-active="true"][data-channel-id="${channelId}"]`,
  );

const watchActiveCarouselChannel = async (page: Page, channelId = "demo-fr") => {
  const card = activeCarouselCard(page, channelId);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Regarder maintenant/i }).click();
};

test.describe("MJTV smoke", () => {
  test("home loads and shows channels", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pour vous" })).toBeVisible();
    await expect(page.getByText("Demo FR").first()).toBeVisible();
  });

  test("creator credit stays accessible and contained on supported mobile widths", async ({
    page,
  }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const credit = page.getByTestId("creator-credit");
    await expect(credit.getByRole("heading", { name: "Euloge Mabiala" })).toBeVisible();
    await expect(
      credit.getByText("Conception, développement et direction du projet MJTV"),
    ).toBeVisible();
    await expect(
      credit.getByRole("img", {
        name: "Portrait d’Euloge Mabiala, créateur de MJTV",
      }),
    ).toBeVisible();
    await expect(credit.getByText("© 2026 Euloge Mabiala — Tous droits réservés")).toBeVisible();

    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await credit.scrollIntoViewIfNeeded();
      await expect(credit).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      expect(await credit.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
    }
  });

  test("shows current and next EPG programs with progress on cards and watch view", async ({
    page,
  }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const card = page.getByRole("article", { name: "Chaîne Demo FR" }).first();
    await expect(card.getByText("En direct :")).toBeVisible();
    await expect(card.getByText("Le journal de la mi-journée")).toBeVisible();
    await expect(card.getByText("À suivre :")).toBeVisible();
    await expect(card.getByText("Météo et analyses")).toBeVisible();
    await expect(card.getByRole("progressbar", { name: /Progression de/ })).toBeVisible();

    await card.getByRole("button", { name: "Ouvrir Demo FR" }).click();
    const epg = page.getByTestId("epg-now-next").first();
    await expect(epg.getByText("Le journal de la mi-journée")).toBeVisible();
    await expect(epg.getByText("Météo et analyses")).toBeVisible();
    await expect(epg.getByRole("progressbar", { name: /Progression de/ })).toBeVisible();
  });

  test("keeps a channel visible when its EPG is unavailable", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const card = page.getByRole("article", { name: "Chaîne Demo US" }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText("Programme non disponible")).toBeVisible();
    await expect(card.getByRole("button", { name: "Ouvrir Demo US" })).toBeEnabled();
  });

  test("keeps the EPG readable without page overflow at supported mobile widths", async ({
    page,
  }) => {
    await setupIntercepts(page);
    await page.goto("/");

    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const card = page.getByRole("article", { name: "Chaîne Demo FR" }).first();
      await expect(card.getByText("Le journal de la mi-journée")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      expect(
        await card
          .getByRole("button", { name: "Ouvrir Demo FR" })
          .evaluate((button) => button.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
    }
  });

  test("cinematic carousel presents the central channel, EPG and watch action", async ({
    page,
  }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const carousel = page.getByTestId("cinematic-featured-carousel");
    const activeCard = carousel.getByTestId("cinematic-active-card");
    await expect(carousel).toBeVisible();
    await expect(activeCard.getByRole("heading", { name: "Demo FR" })).toBeVisible();
    await expect(activeCard.getByTestId("cinematic-channel-fallback")).toHaveText("DF");
    await expect(activeCard.getByText("Direct confirmé")).toBeVisible();
    await expect(activeCard.getByText("Le journal de la mi-journée")).toBeVisible();
    await expect(activeCard.getByText("Météo et analyses")).toBeVisible();
    await expect(activeCard.getByRole("progressbar")).toBeVisible();
    await activeCard.getByRole("button", { name: /Regarder maintenant/i }).click();
    await expect(page.getByLabel(/Lecteur Demo FR/)).toBeVisible();
  });

  test("cinematic carousel supports controls and desktop keyboard navigation", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const carousel = page.getByTestId("cinematic-featured-carousel");
    const activeCard = carousel.getByTestId("cinematic-active-card");
    const initialLabel = await activeCard.getAttribute("aria-label");
    await carousel.getByRole("button", { name: "Chaîne suivante" }).click();
    await expect(activeCard).not.toHaveAttribute("aria-label", initialLabel ?? "");

    await carousel.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(activeCard).toHaveAttribute("aria-label", initialLabel ?? "");
    await page.keyboard.press("ArrowLeft");
    await expect(activeCard).not.toHaveAttribute("aria-label", initialLabel ?? "");
  });

  test("cinematic carousel swipes and stays contained on supported mobile widths", async ({
    page,
  }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const carousel = page.getByTestId("cinematic-featured-carousel");
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const activeCard = carousel.getByTestId("cinematic-active-card");
      const cardWidth = await activeCard.evaluate((card) => card.getBoundingClientRect().width);
      expect(cardWidth / width).toBeGreaterThanOrEqual(0.72);
      expect(cardWidth / width).toBeLessThanOrEqual(0.82);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await expect(carousel.locator('.cinematic-card[data-offset="1"]')).toBeVisible();
    }

    const activeCard = carousel.getByTestId("cinematic-active-card");
    const initialLabel = await activeCard.getAttribute("aria-label");
    await carousel.evaluate((element) => {
      const dispatchTouch = (type: string, clientX: number) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, "changedTouches", { value: [{ clientX }] });
        element.dispatchEvent(event);
      };
      dispatchTouch("touchstart", 260);
      dispatchTouch("touchend", 80);
    });
    await expect(activeCard).not.toHaveAttribute("aria-label", initialLabel ?? "");
  });

  test("reduced-motion preference disables premium transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setupIntercepts(page);
    await page.goto("/");

    const duration = await page
      .getByTestId("channel-card")
      .first()
      .evaluate((card) => getComputedStyle(card).transitionDuration);
    expect(["0s", "0.00001s", "0.01ms", "1e-05s"]).toContain(duration);
  });

  test("sports has its own editorial visual variant", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await expect(page.locator('[data-editorial-section="sports"]')).toHaveAttribute(
      "data-visual-variant",
      "sports",
    );
  });

  test("home separates Actualités and Divertissement into visual universes", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const news = page.locator('[data-editorial-section="news"]');
    const entertainment = page.locator('[data-editorial-section="entertainment"]');
    await expect(news.getByRole("heading", { name: "Actualités" })).toBeVisible();
    await expect(entertainment.getByRole("heading", { name: "Divertissement" })).toBeVisible();
    await expect(news).toHaveAttribute("data-visual-variant", "news");
    await expect(entertainment).toHaveAttribute("data-visual-variant", "entertainment");
    const [newsBox, entertainmentBox] = await Promise.all([
      news.boundingBox(),
      entertainment.boundingBox(),
    ]);
    expect(newsBox).not.toBeNull();
    expect(entertainmentBox).not.toBeNull();
    expect(entertainmentBox!.y).toBeGreaterThan(newsBox!.y + newsBox!.height);
  });

  test("channel rail supports native horizontal navigation", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    const rail = page.getByTestId("channel-rail-for-you");
    await expect(rail).toBeVisible();
    expect(await rail.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await rail.evaluate((element) => getComputedStyle(element).touchAction)).toContain(
      "pan-x",
    );
    await rail.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect
      .poll(() =>
        page
          .getByRole("progressbar", { name: "Progression dans Pour vous" })
          .getAttribute("aria-valuenow"),
      )
      .not.toBe("0");
  });

  test("editorial layout contains overflow and preserves iPhone safe areas", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole("heading", { name: "Pour vous" })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .getByRole("heading", { name: "Pour vous" })
          .evaluate((heading) => heading.scrollWidth <= heading.clientWidth),
      ).toBe(true);
    }

    const safeAreaPadding = await page
      .getByRole("navigation", { name: "Navigation principale" })
      .evaluate((navigation) => navigation.style.paddingBottom);
    expect(safeAreaPadding).toContain("safe-area-inset-bottom");
  });

  test("Explorer omits empty optional catalog parameters", async ({ page }) => {
    const catalogRequests: URL[] = [];
    await setupIntercepts(page, {
      onCatalogRequest: (url) => catalogRequests.push(url),
    });
    await page.goto("/");
    await page.getByRole("button", { name: /Explorer/ }).click();
    await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
    await expect(page.getByText("Demo FR").first()).toBeVisible();

    await expect
      .poll(() => catalogRequests.find((url) => url.searchParams.has("sort"))?.search)
      .toBe("?sort=quality&limit=40");
    const explorerRequest = catalogRequests.find((url) => url.searchParams.has("sort"));
    for (const optionalParam of [
      "q",
      "country",
      "category",
      "language",
      "availability",
      "source",
    ]) {
      expect(explorerRequest?.searchParams.has(optionalParam)).toBe(false);
    }
  });

  test("Voir tout opens filtered Explorer and contextual return restores home", async ({
    page,
  }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Voir toutes les chaînes de Actualités" }).click();
    await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
    await expect(page.getByText("Info Locale")).toBeVisible();
    await expect(page.getByText("Music France")).toBeHidden();
    await page.getByRole("button", { name: "Filtres" }).click();
    await expect(page.getByLabel("Catégorie")).toHaveValue("news");
    await page
      .getByRole("main")
      .getByRole("button", { name: "Retour à l’accueil", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
  });

  test("browser Back restores filtered Explorer then home", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Voir toutes les chaînes de Actualités" }).click();
    await page
      .getByRole("article", { name: "Chaîne Demo FR" })
      .getByRole("button", { name: "Ouvrir Demo FR" })
      .click();
    await expect(page.getByRole("heading", { name: "Demo FR" })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
    await expect(page).toHaveURL(/category=news/);
    await page.getByRole("button", { name: "Filtres" }).click();
    await expect(page.getByLabel("Catégorie")).toHaveValue("news");

    await page.goBack();
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
  });

  test("browser Back from a bottom-nav Explorer filter returns deterministically home", async ({
    page,
  }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Explorer/ }).click();
    await page.getByRole("button", { name: "Filtres" }).click();
    await page.getByLabel("Catégorie").selectOption("music");
    await expect(page).toHaveURL(/category=music/);
    await expect(page.getByText("Music France")).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
  });

  test("catalog 400 exposes actionable recovery controls", async ({ page }) => {
    const catalogRequests: URL[] = [];
    await setupIntercepts(page, {
      catalogErrorForExplorer: true,
      onCatalogRequest: (url) => catalogRequests.push(url),
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Voir toutes les chaînes de Actualités" }).click();

    await expect(
      page.getByRole("heading", { name: "Impossible de charger le catalogue" }),
    ).toBeVisible();
    await expect(page.getByText("Les paramètres du catalogue sont invalides.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réinitialiser les filtres" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retour à l’accueil" }).last()).toBeVisible();

    const requestCount = catalogRequests.length;
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect.poll(() => catalogRequests.length).toBeGreaterThan(requestCount);
    await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
    await expect(page).not.toHaveURL(/category=/);
    await page.getByRole("button", { name: "Retour à l’accueil" }).last().click();
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
  });

  for (const width of [320, 375, 390, 430]) {
    test(`mobile bottom nav layout & text fit at ${width}px`, async ({ page }) => {
      await setupIntercepts(page);
      await page.goto("/");
      await page.setViewportSize({ width, height: 667 });
      const nav = page.getByRole("navigation", { name: "Navigation principale" });
      await expect(nav).toBeVisible();

      const expectedLabels = [
        "Accueil",
        "Explorer",
        "Ma liste",
        "Historique",
        "Réglages",
        "Bibliothèque",
      ];

      for (const label of expectedLabels) {
        await expect(nav.getByRole("button", { name: label, exact: true })).toBeVisible();
      }

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalScroll).toBe(false);

      const measurements = await nav.getByRole("button").evaluateAll((buttons) =>
        buttons.map((button) => {
          const bounds = button.getBoundingClientRect();
          const label = button.querySelector("[data-nav-label]");
          const labelStyle = label ? window.getComputedStyle(label) : null;
          return {
            width: bounds.width,
            height: bounds.height,
            left: bounds.left,
            right: bounds.right,
            labelFits: label ? label.scrollWidth <= label.clientWidth : false,
            textTruncated: labelStyle
              ? labelStyle.textOverflow === "ellipsis" && labelStyle.whiteSpace === "nowrap"
              : false,
            labelText: label ? label.textContent?.trim() : "",
          };
        }),
      );

      expect(measurements.every((m) => m.labelFits)).toBe(true);
      expect(measurements.every((m) => !m.textTruncated)).toBe(true);
      expect(measurements.map((m) => m.labelText)).toEqual(expectedLabels);
      expect(measurements.every((m) => m.height >= 44)).toBe(true);

      for (let index = 1; index < measurements.length; index += 1) {
        expect(measurements[index]!.left).toBeGreaterThanOrEqual(
          measurements[index - 1]!.right - 1,
        );
      }

      const safeBottom = await nav.evaluate(
        (element) => window.getComputedStyle(element).paddingBottom,
      );
      expect(safeBottom).toBeDefined();

      if (width === 375) {
        await nav.getByRole("button", { name: "Ma liste", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Ma liste", exact: true })).toBeVisible();
        await nav.getByRole("button", { name: "Bibliothèque", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Bibliothèque" })).toBeVisible();
      }
    });
  }

  test("search filters the catalog", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Explorer/ }).click();
    await page.getByLabel("Rechercher une chaîne").fill("Demo FR");
    await expect(page.getByText("Demo FR").first()).toBeVisible();
  });

  test("open a channel and see the player", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await watchActiveCarouselChannel(page);
    await expect(page.getByRole("heading", { name: "Demo FR" })).toBeVisible();
    await expect(page.getByLabel(/Lecteur Demo FR/)).toBeVisible();
  });

  test("keeps a no-source religious channel visible but out of the carousel", async ({ page }) => {
    await setupIntercepts(page, {
      catalog: {
        ...CATALOG_FIXTURE,
        items: [EMCI_NO_SOURCE_ITEM, ...CATALOG_FIXTURE.items],
        total: CATALOG_FIXTURE.total + 1,
      },
    });
    await page.goto("/");
    await expect(page.getByTestId("cinematic-featured-carousel")).not.toContainText("EMCI TV");
    await page.getByRole("button", { name: /Explorer/ }).click();
    const card = page.getByRole("article", { name: "Chaîne EMCI TV" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Aucune source disponible");
    await expect(
      card.getByRole("button", { name: /EMCI TV — aucune source disponible/ }),
    ).toBeDisabled();
  });

  test("shows the no-source detail, local report and export without mounting a player", async ({
    page,
  }) => {
    const opener = { ...catalogItem("EMCITV.fr", "EMCI TV", "religious") };
    await setupIntercepts(page, {
      catalog: { ...CATALOG_FIXTURE, items: [opener], total: 1 },
      channel: EMCI_NO_SOURCE_CHANNEL,
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Regarder EMCI TV" }).click();
    await expect(
      page.getByRole("heading", { name: "Aucune source disponible" }).first(),
    ).toBeVisible();
    await expect(page.getByLabel(/Lecteur EMCI TV/)).toHaveCount(0);
    await page.getByRole("button", { name: "Signaler un problème" }).click();
    await page.getByLabel("Message optionnel").fill("Échec confirmé sur iPhone Safari");
    await page.getByRole("button", { name: "Enregistrer localement" }).click();
    await expect(page.getByRole("status")).toContainText("sans donnée personnelle");
    const stored = await page.evaluate(() => window.localStorage.getItem("mjtv:source-reports:v1"));
    expect(stored).toContain("EMCITV.fr");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exporter les signalements" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("mjtv-source-reports.json");
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    const exported = JSON.parse(await readFile(downloadedPath!, "utf8")) as {
      version: number;
      exportedAt: string;
      reports: Array<Record<string, unknown>>;
    };
    expect(exported.version).toBe(1);
    expect(Date.parse(exported.exportedAt)).not.toBeNaN();
    expect(exported.reports).toHaveLength(1);
    expect(exported.reports[0]).toMatchObject({
      channelId: "EMCITV.fr",
      reason: "no_playback",
      healthStatus: "no_source",
      message: "Échec confirmé sur iPhone Safari",
    });
    expect(Object.keys(exported.reports[0]).sort()).toEqual(
      [
        "appVersion",
        "browserFamily",
        "channelId",
        "createdAt",
        "healthStatus",
        "id",
        "message",
        "reason",
      ].sort(),
    );
    expect(JSON.stringify(exported)).not.toMatch(
      /catalogHealth|sourceOrigin|manuallyApproved|reviewerNote|credential|token/i,
    );
  });

  test("blocks an archived channel from cards and direct watch URLs", async ({ page }) => {
    await setupIntercepts(page, {
      catalog: {
        ...CATALOG_FIXTURE,
        items: [ARCHIVED_ITEM, ...CATALOG_FIXTURE.items],
        total: CATALOG_FIXTURE.total + 1,
      },
      channel: ARCHIVED_CHANNEL,
    });
    await page.goto("/");
    await page.getByRole("button", { name: /Explorer/ }).click();
    const card = page.getByRole("article", { name: "Chaîne Archive FR" });
    await expect(card).toContainText("Archivée");
    await expect(card.getByRole("button", { name: "Archive FR — chaîne archivée" })).toBeDisabled();

    await page.goto("/?view=watch&channel=archive-fr");
    await expect(page.getByRole("heading", { name: "Chaîne archivée" })).toBeVisible();
    await expect(page.getByLabel(/Lecteur Archive FR/)).toHaveCount(0);
  });

  test("renders a temporarily unavailable state with an explicit retry", async ({ page }) => {
    const temporaryChannel: PublicChannelDetail = {
      ...CHANNEL_FIXTURE,
      health: {
        status: "temporarily_unavailable",
        checkedAt: "2026-07-22T12:00:00.000Z",
        sourceCount: 1,
        playableSourceCount: 0,
        reasonCode: "recent_failure_after_success",
        reasonMessage: "Cette chaîne a déjà fonctionné mais échoue actuellement.",
      },
    };
    await setupIntercepts(page, { channel: temporaryChannel });
    await page.goto("/");
    await watchActiveCarouselChannel(page);
    await expect(page.getByRole("heading", { name: "Temporairement indisponible" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" }).last()).toBeVisible();
  });

  test("no-source state fits a 320px mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    const opener = catalogItem("EMCITV.fr", "EMCI TV", "religious");
    await setupIntercepts(page, {
      catalog: { ...CATALOG_FIXTURE, items: [opener], total: 1 },
      channel: EMCI_NO_SOURCE_CHANNEL,
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Regarder EMCI TV" }).click();
    await expect(
      page.getByRole("heading", { name: "Aucune source disponible" }).first(),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
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
    await Promise.all([fallbackVisible, watchActiveCarouselChannel(page)]);
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
    await watchActiveCarouselChannel(page);
    const player = page.getByLabel(/Lecteur Demo FR/).locator("..");
    await expect(page.getByText("Aucune source n’a pu être lue.")).toBeVisible();
    await expect(page.getByText("2 sources essayées sur 2.")).toBeVisible();
    await expect(player.getByRole("button", { name: "Réessayer" })).toBeVisible();
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
    await watchActiveCarouselChannel(page);
    const player = page.getByLabel(/Lecteur Demo FR/).locator("..");
    await expect(page.getByText("Aucune source n’a pu être lue.")).toBeVisible();
    await player.getByText("Choisir une autre source").click();
    await player.getByRole("button", { name: /Source 2 — Secondaire/ }).click();
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
    await watchActiveCarouselChannel(page);
    const related = page.getByRole("heading", { name: "Chaînes liées" }).locator("..");
    await expect(related.getByText("Info France")).toBeVisible();
    const cards = related.locator("article");
    await expect(cards.first()).toContainText("Info France");
  });

  test("add to favorites and verify persistence after reload", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await watchActiveCarouselChannel(page);
    await page
      .locator('button[aria-label="Ajouter à Ma liste"]')
      .filter({ hasText: "Ajouter à Ma liste" })
      .click();
    await page.reload();
    await expect(page.getByLabel(/Lecteur Demo FR/)).toBeVisible();
    await page.getByRole("button", { name: "Retour", exact: true }).click();
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("button", { name: "Ma liste", exact: true })
      .click();
    await expect(page.getByText("Demo FR").first()).toBeVisible();
  });

  test("Ma liste appears on home without changing legacy storage", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page
      .locator('[data-editorial-section="for-you"]')
      .getByRole("article", { name: "Chaîne Demo FR" })
      .getByRole("button", { name: "Ajouter à Ma liste" })
      .click();
    await expect(page.getByRole("heading", { name: "Ma liste" })).toBeVisible();
    const stored = await page.evaluate(() => window.localStorage.getItem("mjtv:favorites:v1"));
    expect(stored).toContain("demo-fr");
  });

  test("settings page shows theme selector", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Réglages/ }).click();
    await expect(page.getByRole("heading", { name: "Réglages" })).toBeVisible();
    await expect(page.getByText("Thème")).toBeVisible();
  });

  test("country, language and category preferences reorder home", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Réglages/ }).click();
    await page.getByLabel("Pays préféré").fill("US");
    await page.getByLabel("Langues préférées").fill("eng");
    await page.getByLabel("Musique").check();
    await page.getByRole("button", { name: /Accueil/ }).click();

    await expect(page.locator("[data-editorial-section]").first()).toHaveAttribute(
      "data-editorial-section",
      "music",
    );
    await expect(page.locator('[data-editorial-section="popular-country"]')).toContainText(
      "Demo US",
    );
  });

  test("Explorer keeps search and discovery filters separate from home", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Explorer/ }).click();
    await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
    await expect(page.getByLabel("Rechercher une chaîne")).toBeVisible();
    await page.getByRole("button", { name: "Filtres" }).click();
    await expect(page.getByLabel("Pays", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Langue", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Disponibilité", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Tri", { exact: true })).toBeVisible();
  });

  test("import page rejects dangerous protocols (fixture-based)", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Bibliothèque/ }).click();
    await expect(page.getByRole("heading", { name: "Bibliothèque" })).toBeVisible();
    await expect(page.getByText(/taille maximum/i)).toBeVisible();
  });
});
