export type TvRemoteDirection = "up" | "down" | "left" | "right";

export type TvRemoteAction =
  | { type: "move"; direction: TvRemoteDirection }
  | { type: "select" }
  | { type: "back" }
  | { type: "channel_step"; delta: 1 | -1 }
  | { type: "open_guide" };

/**
 * Maps standard keyboard, Smart TV, Android TV, and Apple TV Web remote key names
 * to semantic MJTV actions.
 */
export const mapRemoteKeyToAction = (key: string): TvRemoteAction | null => {
  switch (key) {
    case "ArrowUp":
      return { type: "move", direction: "up" };
    case "ArrowDown":
      return { type: "move", direction: "down" };
    case "ArrowLeft":
      return { type: "move", direction: "left" };
    case "ArrowRight":
      return { type: "move", direction: "right" };
    case "Enter":
      return { type: "select" };
    case "BrowserBack":
    case "GoBack":
      return { type: "back" };
    case "ChannelUp":
    case "PageUp":
      return { type: "channel_step", delta: -1 };
    case "ChannelDown":
    case "PageDown":
      return { type: "channel_step", delta: 1 };
    case "Guide":
    case "TVGuide":
      return { type: "open_guide" };
    default:
      return null;
  }
};

/**
 * Computes the next item index in a 2D grid for D-Pad directional navigation.
 * Clamps within `[0, totalItems - 1]` without wrapping rows unexpectedly.
 */
export const computeNextGridIndex = (
  currentIndex: number,
  totalItems: number,
  columns: number,
  direction: TvRemoteDirection,
): number => {
  if (totalItems <= 0) return -1;
  const safeCols = Math.max(1, Math.floor(columns));
  const clampedCurrent = Math.min(Math.max(0, currentIndex), totalItems - 1);

  switch (direction) {
    case "left":
      return Math.max(0, clampedCurrent - 1);
    case "right":
      return Math.min(totalItems - 1, clampedCurrent + 1);
    case "up": {
      const target = clampedCurrent - safeCols;
      return target >= 0 ? target : clampedCurrent;
    }
    case "down": {
      const target = clampedCurrent + safeCols;
      return target < totalItems ? target : Math.min(totalItems - 1, clampedCurrent);
    }
  }
};

/**
 * Estimates the active number of columns in a responsive CSS grid container
 * by comparing horizontal offsets of the first row items, falling back to `fallbackColumns`.
 */
export const detectGridColumns = (items: readonly HTMLElement[], fallbackColumns = 4): number => {
  if (items.length <= 1) return 1;
  const firstRect = items[0]!.getBoundingClientRect();
  if (firstRect.width === 0 && firstRect.top === 0) {
    return Math.max(1, fallbackColumns);
  }
  let cols = 1;
  for (let i = 1; i < items.length; i++) {
    const rect = items[i]!.getBoundingClientRect();
    if (Math.abs(rect.top - firstRect.top) <= 8) {
      cols += 1;
    } else {
      break;
    }
  }
  return Math.max(1, cols);
};

/**
 * Moves DOM focus across primary card buttons inside a grid container on D-Pad arrow key press.
 * Returns true if focus was moved.
 */
export const navigateFocusableGrid = (
  container: HTMLElement,
  key: string,
  fallbackColumns = 4,
): boolean => {
  const action = mapRemoteKeyToAction(key);
  if (!action || action.type !== "move") return false;

  const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-testid="channel-card"]'));
  const targets = cards
    .map((card) => card.querySelector<HTMLButtonElement>("button:not(:disabled)"))
    .filter((btn): btn is HTMLButtonElement => btn !== null);

  if (targets.length === 0) return false;

  const activeEl = container.ownerDocument.activeElement;
  const currentIndex = targets.findIndex(
    (btn) =>
      btn === activeEl ||
      (activeEl instanceof Node && btn.closest('[data-testid="channel-card"]')?.contains(activeEl)),
  );

  if (currentIndex === -1) {
    targets[0]!.focus();
    return true;
  }

  const columns = detectGridColumns(cards, fallbackColumns);
  const nextIndex = computeNextGridIndex(currentIndex, targets.length, columns, action.direction);
  if (nextIndex >= 0 && nextIndex !== currentIndex) {
    targets[nextIndex]!.focus();
    return true;
  }
  return false;
};
