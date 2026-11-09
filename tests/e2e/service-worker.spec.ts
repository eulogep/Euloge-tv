import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";

test("service worker excludes API and private data while preserving the offline shell", async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "This cache probe uses Chromium service workers.");
  const script = await readFile(resolve(process.cwd(), "public/sw.js"), "utf8");
  let apiRequests = 0;
  let assetRequests = 0;
  let privateRequests = 0;
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://fixture").pathname;
    response.setHeader("Cache-Control", "no-store");
    if (pathname === "/sw.js") {
      response.setHeader("Content-Type", "application/javascript");
      response.end(script);
    } else if (pathname === "/api/probe") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ generation: ++apiRequests }));
    } else if (pathname === "/admin") {
      response.setHeader("Content-Type", "text/html");
      response.setHeader("Cache-Control", "private, no-store");
      response.end("<h1>Private fixture</h1>");
    } else if (pathname === "/private.txt") {
      response.setHeader("Cache-Control", "private, no-store");
      response.end(`private ${++privateRequests}`);
    } else if (pathname === "/asset.txt") {
      response.setHeader("Cache-Control", "public, max-age=0");
      response.end(`asset ${++assetRequests}`);
    } else {
      response.setHeader("Content-Type", "text/html");
      response.setHeader("Cache-Control", "public, max-age=0");
      response.end("<h1>Shell fixture</h1>");
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture address");
  const base = `http://127.0.0.1:${address.port}`;
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    await page.goto(base);
    await page.evaluate(async () => {
      const legacy = await caches.open("mjtv-shell-v2");
      await legacy.put("/api/legacy", new Response("stale fixture"));
      await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((done) =>
          navigator.serviceWorker.addEventListener("controllerchange", () => done(), {
            once: true,
          }),
        );
      }
    });
    await expect
      .poll(() => page.evaluate(async () => Boolean(await caches.match("/api/legacy"))))
      .toBe(false);
    const first = await page.evaluate(() =>
      fetch("/api/probe").then((response) => response.json()),
    );
    const second = await page.evaluate(() =>
      fetch("/api/probe").then((response) => response.json()),
    );
    expect([first.generation, second.generation]).toEqual([1, 2]);

    await page.evaluate(() =>
      fetch("/asset.txt", { cache: "reload" }).then((response) => response.text()),
    );
    await expect
      .poll(() => page.evaluate(async () => Boolean(await caches.match("/asset.txt"))))
      .toBe(true);
    await page.evaluate(() =>
      fetch("/asset.txt", { cache: "reload" }).then((response) => response.text()),
    );
    expect(assetRequests).toBe(1);
    await page.evaluate(() => fetch("/private.txt").then((response) => response.text()));
    await page.evaluate(() => fetch("/private.txt").then((response) => response.text()));
    expect(privateRequests).toBe(2);
    await page.goto(`${base}/admin`);
    expect(
      await page.evaluate(async () => ({
        api: Boolean(await caches.match("/api/probe")),
        admin: Boolean(await caches.match("/admin")),
        private: Boolean(await caches.match("/private.txt")),
      })),
    ).toEqual({ api: false, admin: false, private: false });

    await page.goto(base);
    await context.setOffline(true);
    expect(
      await page.evaluate(() =>
        fetch("/api/probe").then(
          () => true,
          () => false,
        ),
      ),
    ).toBe(false);
    const adminPage = await context.newPage();
    let privateVisible = false;
    try {
      await adminPage.goto(`${base}/admin`, { timeout: 5000 });
      privateVisible =
        (await adminPage.getByRole("heading", { name: "Private fixture" }).count()) > 0;
    } catch {
      // A network failure is expected for the uncached private route.
    }
    expect(privateVisible).toBe(false);
    await adminPage.close();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Shell fixture" })).toBeVisible();
  } finally {
    await context.close();
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  }
});
