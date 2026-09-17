import { Resizable } from '../common/index.js';

/**
 * An active size sync started by `createContainerResizeSync`.
 */
export interface ContainerResizeSync {
  /**
   * Stops watching the container for size changes.
   */
  stop(): void;
}

/**
 * Watches `container` for size changes and calls `resize()` on every entry
 * in `resizables` whenever the container's size actually changes, so a
 * canvas (and anything derived from its width/height, such as a camera's
 * projection matrix) follows a resizable page - or a container that
 * changes size for any other reason, like a fullscreen toggle - instead of
 * staying pinned to whatever size it had when this was created.
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
 * @returns An object whose `stop()` disconnects the observer.
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

    for (const resizable of resizables) {
      if (
        resizable.width === clientWidth &&
        resizable.height === clientHeight
      ) {
        continue;
      }

      resizable.resize(clientWidth, clientHeight);
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

  return {
    stop(): void {
      resizeObserver.disconnect();
    },
  };
}
