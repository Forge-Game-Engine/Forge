import { Resizable } from '../common/index.js';
import { getDevicePixelRatio } from '../rendering/utilities/get-device-pixel-ratio.js';

/**
 * An active size sync started by `createContainerResizeSync`.
 */
export interface ContainerResizeSync {
  /**
   * Stops watching the container for size and device pixel ratio changes.
   */
  stop(): void;
}

/**
 * Watches `container` for size changes and calls `resize()` on every entry
 * in `resizables` whenever the container's size changes, so a canvas (and
 * anything derived from its width/height, such as a camera's projection
 * matrix) follows a resizable page - or a container that changes size for
 * any other reason, like a fullscreen toggle - instead of staying pinned to
 * whatever size it had when this was created.
 *
 * Also watches the display's `devicePixelRatio`, and resizes again whenever
 * it changes - browser zoom, or dragging the window onto a monitor with a
 * different scale factor - even if the container's CSS size stays the same,
 * so a canvas's drawing buffer keeps matching the display's native
 * resolution. Each resizable receives the container's size in CSS pixels
 * plus the current device pixel ratio, and derives its own drawing-buffer
 * size from them (see `RenderContext.resize`).
 *
 * Watching starts immediately and runs independently of any game loop;
 * call the returned `stop()` to disconnect it early (e.g. when switching
 * to a headless mode with no canvas left to keep sized). It's safe to never
 * call `stop()` at all if `container` is simply removed from the DOM -
 * browsers silently drop a `ResizeObserver`'s registration for a target
 * once nothing else references it, so it won't keep the container alive.
 *
 * Does nothing (and returns a no-op `stop()`) if `resizables` is empty.
 * @param container - The element to watch for size changes.
 * @param resizables - The resizable objects (e.g. `RenderContext` instances) to resize whenever `container`'s size changes.
 * @returns An object whose `stop()` disconnects the observer and stops
 * watching the device pixel ratio.
 */
export function createContainerResizeSync(
  container: HTMLElement,
  resizables: readonly Resizable[],
): ContainerResizeSync {
  if (resizables.length === 0) {
    return {
      stop: (): void => {},
    };
  }

  const resizeToContainer = (): void => {
    const { clientWidth, clientHeight } = container;

    if (clientWidth <= 0 || clientHeight <= 0) {
      return;
    }

    const devicePixelRatio = getDevicePixelRatio();

    for (const resizable of resizables) {
      resizable.resize(clientWidth, clientHeight, devicePixelRatio);
    }
  };

  // Deferred to the next frame rather than resizing synchronously in the
  // observer callback: mutating a resizable's size in direct response to a
  // ResizeObserver notification is exactly the pattern that trips the
  // browser's "ResizeObserver loop completed with undelivered
  // notifications" error, since it can itself affect layout before the
  // browser has finished notifying every observer for this cycle.
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(resizeToContainer);
  });

  resizeObserver.observe(container);

  const pixelRatioWatch = watchDevicePixelRatio(() => {
    requestAnimationFrame(resizeToContainer);
  });

  return {
    stop(): void {
      resizeObserver.disconnect();
      pixelRatioWatch.stop();
    },
  };
}

/**
 * Calls `onChange` whenever `window.devicePixelRatio` changes. A
 * `ResizeObserver` alone misses this: moving the window to a monitor with a
 * different scale factor changes the device pixel ratio without changing any
 * element's CSS size. There's no event for the ratio itself, so this matches
 * a `(resolution: <current>dppx)` media query, which stops matching as soon
 * as the ratio changes - and, since that query only describes the ratio it
 * was created with, re-creates it for the new ratio on every change.
 *
 * A no-op where `matchMedia` isn't available (e.g. some test environments).
 */
function watchDevicePixelRatio(onChange: () => void): { stop(): void } {
  if (typeof window.matchMedia !== 'function') {
    return {
      stop: (): void => {},
    };
  }

  let mediaQuery: MediaQueryList | null = null;

  const listen = (): void => {
    mediaQuery = window.matchMedia(
      `(resolution: ${getDevicePixelRatio()}dppx)`,
    );
    mediaQuery.addEventListener('change', handleChange, { once: true });
  };

  function handleChange(): void {
    listen();
    onChange();
  }

  listen();

  return {
    stop(): void {
      mediaQuery?.removeEventListener('change', handleChange);
    },
  };
}
