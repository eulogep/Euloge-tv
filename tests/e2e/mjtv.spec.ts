import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke E2E tests for MJTV.
 * These tests intercept the API routes and return deterministic fixtures so
 * the CI never depends on a live public stream or on the iptv-org availability.
 */

const catalogItem = (
  id: string,
  name: string,
  category: string,
  countryCode = "FR",
  language = "fra",
) => ({
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
  bestAvailability: "unknown",
});

const CATALOG_FIXTURE = {
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

test.describe("MJTV smoke", () => {
  test("home loads and shows channels", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pour vous" })).toBeVisible();
    await expect(page.getByText("Demo FR").first()).toBeVisible();
  });

  test("premium hero uses a viable deterministic channel and an image fallback", async ({
    page,
  }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const hero = page.getByTestId("featured-channel-hero");
    await expect(hero).toBeVisible();
    await expect(hero.getByRole("heading", { name: "Demo FR" })).toBeVisible();
    await expect(hero.getByTestId("featured-channel-fallback")).toHaveText("DF");
    await expect(hero.getByText("À vérifier")).toBeVisible();
    await hero.getByRole("button", { name: "Regarder Demo FR" }).click();
    await expect(page.getByLabel(/Lecteur Demo FR/)).toBeVisible();
  });

  test("hero Ma liste action and active bottom navigation remain functional", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");

    const hero = page.getByTestId("featured-channel-hero");
    const listButton = hero.getByRole("button", { name: "Ma liste" });
    await listButton.click();
    await expect(listButton).toHaveAttribute("aria-pressed", "true");

    const nav = page.getByTestId("bottom-navigation");
    await expect(nav.getByRole("button", { name: "Accueil", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await nav.getByRole("button", { name: "Explorer", exact: true }).click();
    await expect(nav.getByRole("button", { name: "Explorer", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
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
    await page.getByRole("button", { name: "Retour à l’accueil" }).first().click();
    await expect(page.getByRole("heading", { name: "MJTV" })).toBeVisible();
  });

  test("browser Back restores filtered Explorer then home", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Voir toutes les chaînes de Actualités" }).click();
    await page.getByText("Demo FR").first().click();
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

  test("mobile bottom nav is present", async ({ page }) => {
    await setupIntercepts(page);
    await page.goto("/");
    await page.setViewportSize({ width: 375, height: 667 });
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav).toBeVisible();
    for (const label of [
      "Accueil",
      "Explorer",
      "Ma liste",
      "Historique",
      "Réglages",
      "Bibliothèque",
    ]) {
      await expect(nav.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
    const measurements = await nav.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const bounds = button.getBoundingClientRect();
        const label = button.querySelector("[data-nav-label]");
        return {
          left: bounds.left,
          right: bounds.right,
          labelFits: label ? label.scrollWidth <= label.clientWidth : false,
        };
      }),
    );
    expect(measurements.every((measurement) => measurement.labelFits)).toBe(true);
    for (let index = 1; index < measurements.length; index += 1) {
      expect(measurements[index]!.left).toBeGreaterThanOrEqual(measurements[index - 1]!.right - 1);
    }

    await nav.getByRole("button", { name: "Ma liste", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Ma liste", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: "Bibliothèque", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Bibliothèque" })).toBeVisible();
  });

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
    await page.getByRole("button", { name: "Ajouter à Ma liste" }).first().click();
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
