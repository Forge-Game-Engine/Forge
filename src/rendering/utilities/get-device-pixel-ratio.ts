/**
 * Reads the browser's current `window.devicePixelRatio` - how many physical
 * (device) pixels make up one CSS pixel on the display the page is shown on.
 * It's above `1` on any display scaled above 100% (most laptops, every
 * HiDPI/Retina screen) and whenever the page is browser-zoomed in, and can
 * change at runtime (zooming, or dragging the window to another monitor).
 *
 * Falls back to `1` if the value is missing or not a positive, finite number,
 * so callers can always multiply by it safely.
 * @returns The current device pixel ratio.
 */
export function getDevicePixelRatio(): number {
  const { devicePixelRatio } = window;

  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) {
    return 1;
  }

  return devicePixelRatio;
}
