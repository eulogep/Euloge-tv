import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialSound } from "@/features/meridian/presentation/dial-sound";

const gains: { setTargetAtTime: ReturnType<typeof vi.fn>; value: number }[] = [];

const createFakeContext = () => {
  const param = () => {
    const entry = {
      value: 0,
      setTargetAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    return entry;
  };
  const node = () => ({ connect: (target: unknown) => target });
  return class FakeContext {
    static created = 0;
    state = "running";
    currentTime = 0;
    sampleRate = 100;
    destination = {};
    close = vi.fn(async () => {});
    suspend = vi.fn(async () => {
      this.state = "suspended";
    });
    resume = vi.fn(async () => {
      this.state = "running";
    });
    constructor() {
      FakeContext.created += 1;
    }
    createBuffer = () => ({ getChannelData: () => new Float32Array(100) });
    createBufferSource = () => ({ ...node(), buffer: null, loop: false, start: vi.fn() });
    createBiquadFilter = () => ({ ...node(), type: "", frequency: param(), Q: param() });
    createGain = () => {
      const gain = param();
      gains.push(gain);
      return { ...node(), gain };
    };
    createOscillator = () => ({ ...node(), frequency: param(), start: vi.fn(), stop: vi.fn() });
  };
};

describe("dial sound", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gains.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  it("makes nothing at all until the needle moves", () => {
    const Context = createFakeContext();
    new DialSound(Context as unknown as typeof AudioContext);
    expect(Context.created).toBe(0);
  });

  it("follows the speed with one context, quietly, and sleeps when idle", async () => {
    const Context = createFakeContext();
    const sound = new DialSound(Context as unknown as typeof AudioContext);
    sound.setSpeed(1);
    sound.setSpeed(0.5);
    expect(Context.created).toBe(1);
    const [level] = gains[0]!.setTargetAtTime.mock.calls.at(-1) as [number];
    expect(level).toBeCloseTo(0.025);
    expect(gains[0]!.setTargetAtTime.mock.calls[0]![0]).toBeLessThanOrEqual(0.05);
    await vi.advanceTimersByTimeAsync(600);
    sound.dispose();
  });

  it("stays silent where the browser has no audio", () => {
    const sound = new DialSound(undefined);
    expect(() => {
      sound.setSpeed(1);
      sound.lock();
      sound.dispose();
    }).not.toThrow();
  });
});
