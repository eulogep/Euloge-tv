/**
 * Common HTTP helpers shared by API routes.
 */
export const json = <T>(data: T, init?: ResponseInit): Response => Response.json(data, init);

export const jsonError = (status: number, code: string, message: string): Response =>
  json({ error: { code, message } }, { status });

/** Cache-Control for catalog responses — stale-while-revalidate friendly. */
export const catalogCacheHeaders = (): HeadersInit => ({
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
});
