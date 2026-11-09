import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 26 can expose an unusable experimental localStorage over jsdom's storage.
// Supply the browser contract only when the environment did not provide one.
if (typeof window !== "undefined" && !window.localStorage) {
  const entries = new Map<string, string>();
  const fallbackStorage: Storage = {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(String(key)) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => entries.delete(String(key)),
    setItem: (key, value) => {
      entries.set(String(key), String(value));
    },
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: fallbackStorage });
}

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement URL.createObjectURL
if (!("createObjectURL" in URL)) {
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn(() => "blob:mock"),
    writable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    writable: true,
  });
}

// Stub matchMedia (used by ThemeBoot / settings hooks)
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    value: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
    writable: true,
  });
}
