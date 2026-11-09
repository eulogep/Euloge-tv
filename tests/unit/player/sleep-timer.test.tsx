import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSleepTimer } from "@/features/player/application/sleep-timer";
import { SleepTimerLifecycle } from "@/features/player/presentation/SleepTimer";
import { useAppStore } from "@/lib/utils/app-store";

describe("sleep timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSleepTimer.setState({ deadline: null, minutes: 0, finished: false });
    useAppStore.setState({ activePlayerChannelId: "demo", playerMode: "full" });
  });
  afterEach(() => vi.useRealTimers());
  it("rejects unsupported durations and does not expire early or twice", () => {
    useSleepTimer.getState().start(0.1);
    expect(useSleepTimer.getState().deadline).toBeNull();
    useSleepTimer.getState().start(15);
    expect(useSleepTimer.getState().expire()).toBe(false);
    vi.advanceTimersByTime(15 * 60_000);
    expect(useSleepTimer.getState().expire()).toBe(true);
    expect(useSleepTimer.getState().expire()).toBe(false);
  });
  it("closes the active player even after switching to mini mode", () => {
    render(<SleepTimerLifecycle />);
    act(() => {
      useSleepTimer.getState().start(15);
    });
    act(() => {
      useAppStore.setState({ playerMode: "mini" });
    });
    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });
    expect(useAppStore.getState().activePlayerChannelId).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("minuterie a fermé");
  });
  it("cancels on manual player closure without showing a completion notice", () => {
    render(<SleepTimerLifecycle />);
    act(() => {
      useSleepTimer.getState().start(30);
    });
    act(() => {
      useAppStore.setState({ activePlayerChannelId: null });
    });
    act(() => {
      vi.advanceTimersByTime(30 * 60_000);
    });
    expect(useSleepTimer.getState().deadline).toBeNull();
    expect(useSleepTimer.getState().finished).toBe(false);
  });
  it("rechecks the real deadline when returning from a suspended background tab", () => {
    render(<SleepTimerLifecycle />);
    act(() => {
      useSleepTimer.getState().start(15);
    });
    act(() => {
      vi.setSystemTime(Date.now() + 16 * 60_000);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(useAppStore.getState().activePlayerChannelId).toBeNull();
    expect(useSleepTimer.getState().finished).toBe(true);
  });
});
