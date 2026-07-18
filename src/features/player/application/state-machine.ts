import type { PlaybackEvent, PlaybackState } from "../domain/types";

/**
 * Pure state-machine for playback. Every transition is explicit and testable.
 *
 * Valid transitions:
 *   idle      → loading
 *   loading   → ready | error | buffering
 *   ready     → playing | paused
 *   playing   → paused | buffering | ended | error | switching-source
 *   paused    → playing | switching-source | error
 *   buffering → playing | paused | error
 *   switching-source → loading
 *   error     → loading (retry) | idle
 *   ended     → playing (loop?) | idle
 */
const VALID: Record<PlaybackState, PlaybackState[]> = {
  idle: ["loading"],
  loading: ["ready", "error", "buffering"],
  ready: ["playing", "paused", "error", "buffering"],
  playing: ["paused", "buffering", "ended", "error", "switching-source"],
  paused: ["playing", "switching-source", "error", "buffering"],
  buffering: ["playing", "paused", "error", "switching-source"],
  "switching-source": ["loading", "error"],
  error: ["loading", "idle", "switching-source"],
  ended: ["playing", "idle", "loading"],
};

export const initialState: PlaybackState = "idle";

export const canTransition = (from: PlaybackState, to: PlaybackState): boolean =>
  VALID[from]?.includes(to) ?? false;

export const reducePlayback = (state: PlaybackState, event: PlaybackEvent): PlaybackState => {
  switch (event.type) {
    case "LOAD":
      return state === "idle" ||
        state === "switching-source" ||
        state === "error" ||
        state === "ended"
        ? "loading"
        : state;
    case "READY":
      return canTransition(state, "ready") ? "ready" : state;
    case "PLAY":
      return canTransition(state, "playing") ? "playing" : state;
    case "PAUSE":
      return canTransition(state, "paused") ? "paused" : state;
    case "BUFFERING":
      return canTransition(state, "buffering") ? "buffering" : state;
    case "SWITCH_SOURCE":
      return canTransition(state, "switching-source") ? "switching-source" : state;
    case "ENDED":
      return canTransition(state, "ended") ? "ended" : state;
    case "ERROR":
      return canTransition(state, "error") ? "error" : state;
    case "RECOVERED":
      // After a successful recovery, return to a buffering/ready-like state.
      if (state === "error") return "buffering";
      return state;
    case "RESET":
      return "idle";
    default:
      return state;
  }
};
