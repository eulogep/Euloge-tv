import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadSourceReports } from "@/features/catalog/presentation/SourceReportPanel";

describe("downloadSourceReports", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the Blob URL alive through the click, then revokes it and removes the anchor", () => {
    vi.useFakeTimers();
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:reports");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    let anchor: HTMLAnchorElement | null = null;
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") anchor = element as HTMLAnchorElement;
      return element;
    });

    downloadSourceReports();

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(anchor).not.toBeNull();
    expect(document.body.contains(anchor)).toBe(false);
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();

    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:reports");
    expect(click.mock.invocationCallOrder[0]).toBeLessThan(
      revokeObjectUrl.mock.invocationCallOrder[0],
    );
  });

  it("still removes the anchor and schedules revocation when the click throws", () => {
    vi.useFakeTimers();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:reports");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("download blocked");
    });
    const originalCreateElement = document.createElement.bind(document);
    let anchor: HTMLAnchorElement | null = null;
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") anchor = element as HTMLAnchorElement;
      return element;
    });

    expect(() => downloadSourceReports()).toThrow("download blocked");
    expect(anchor).not.toBeNull();
    expect(document.body.contains(anchor)).toBe(false);
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:reports");
  });
});
