import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageCache } from '../asset-loading/index.js';
import { Resizable } from '../common/index.js';
import { RenderContext } from '../rendering/index.js';
import { ShaderCache } from '../rendering/shaders/index.js';
import { createContainerResizeSync } from './create-container-resize-sync.js';

/**
 * jsdom doesn't implement `ResizeObserver`, so tests install this stand-in
 * on the global before calling `createContainerResizeSync`. It records the
 * observed element and lets a test trigger a resize callback manually,
 * rather than relying on a real layout engine.
 */
class FakeResizeObserver {
  public observedElement: Element | null = null;
  public disconnected = false;

  private readonly _callback: ResizeObserverCallback;

  public static readonly instances: FakeResizeObserver[] = [];

  constructor(callback: ResizeObserverCallback) {
    this._callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  public observe(element: Element): void {
    this.observedElement = element;
  }

  public disconnect(): void {
    this.disconnected = true;
  }

  public unobserve(): void {}

  public trigger(): void {
    this._callback([], this);
  }
}

/**
 * jsdom doesn't implement `matchMedia`, so tests that cover device pixel
 * ratio changes install a factory producing these. `dispatchChange`
 * simulates the browser reporting that the query stopped matching.
 */
class FakeMediaQueryList {
  public readonly media: string;

  private readonly _listeners = new Set<() => void>();
  private readonly _onceWrappers = new Map<() => void, () => void>();

  constructor(media: string) {
    this.media = media;
  }

  get listenerCount(): number {
    return this._listeners.size;
  }

  public addEventListener(
    _type: string,
    listener: () => void,
    options?: AddEventListenerOptions,
  ): void {
    if (!options?.once) {
      this._listeners.add(listener);

      return;
    }

    const onceListener = (): void => {
      this._listeners.delete(onceListener);
      listener();
    };

    this._listeners.add(onceListener);
    this._onceWrappers.set(listener, onceListener);
  }

  public removeEventListener(_type: string, listener: () => void): void {
    this._listeners.delete(this._onceWrappers.get(listener) ?? listener);
  }

  public dispatchChange(): void {
    for (const listener of [...this._listeners]) {
      listener();
    }
  }
}

describe('createContainerResizeSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  let container: HTMLElement;
  let renderContext: RenderContext;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    FakeResizeObserver.instances.length = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    container = document.createElement('div');
    rafCallbacks = [];

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback);

      return rafCallbacks.length;
    });

    const canvas = document.createElement('canvas');
    const mockGl = {
      createBuffer: vi.fn().mockReturnValue({}),
      viewport: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    renderContext = new RenderContext(
      new ShaderCache([]),
      new ImageCache(),
      canvas,
    );
  });

  // Invokes the most recently scheduled `requestAnimationFrame` callback, so
  // a test can flush the resize that a `ResizeObserver` notification defers
  // to the next frame.
  const flushLatestAnimationFrame = (): void => {
    rafCallbacks[rafCallbacks.length - 1](0);
  };

  it('does not observe the container when there are no resizables', () => {
    createContainerResizeSync(container, []);

    expect(FakeResizeObserver.instances).toHaveLength(0);
  });

  it('observes the container for size changes', () => {
    createContainerResizeSync(container, [renderContext]);

    expect(FakeResizeObserver.instances).toHaveLength(1);
    expect(FakeResizeObserver.instances[0].observedElement).toBe(container);
  });

  it("resizes every resizable to the container's current size when the container resizes", () => {
    createContainerResizeSync(container, [renderContext]);

    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });

    const resizeSpy = vi.spyOn(renderContext, 'resize');

    FakeResizeObserver.instances[0].trigger();
    flushLatestAnimationFrame();

    expect(resizeSpy).toHaveBeenCalledWith(800, 600, 1);
  });

  it('resizes every resizable independently, when there is more than one', () => {
    const secondResizable: Resizable = {
      width: 100,
      height: 100,
      resize: vi.fn(),
    };

    createContainerResizeSync(container, [renderContext, secondResizable]);

    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });

    const resizeSpy = vi.spyOn(renderContext, 'resize');

    FakeResizeObserver.instances[0].trigger();
    flushLatestAnimationFrame();

    expect(resizeSpy).toHaveBeenCalledWith(800, 600, 1);
    expect(secondResizable.resize).toHaveBeenCalledWith(800, 600, 1);
  });

  it("leaves the render context's canvas untouched when the container reports its current size", () => {
    createContainerResizeSync(container, [renderContext]);

    Object.defineProperty(container, 'clientWidth', {
      value: renderContext.cssWidth,
    });
    Object.defineProperty(container, 'clientHeight', {
      value: renderContext.cssHeight,
    });

    const widthSetter = vi.spyOn(renderContext.canvas, 'width', 'set');

    FakeResizeObserver.instances[0].trigger();
    flushLatestAnimationFrame();

    expect(widthSetter).not.toHaveBeenCalled();
  });

  it("passes the display's current device pixel ratio along with the container's CSS size", () => {
    vi.stubGlobal('devicePixelRatio', 2);
    createContainerResizeSync(container, [renderContext]);

    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });

    FakeResizeObserver.instances[0].trigger();
    flushLatestAnimationFrame();

    expect(renderContext.cssWidth).toBe(800);
    expect(renderContext.cssHeight).toBe(600);
    expect(renderContext.width).toBe(1600);
    expect(renderContext.height).toBe(1200);
  });

  it('does not resize when the container is momentarily zero-sized', () => {
    createContainerResizeSync(container, [renderContext]);

    Object.defineProperty(container, 'clientWidth', { value: 0 });
    Object.defineProperty(container, 'clientHeight', { value: 0 });

    const resizeSpy = vi.spyOn(renderContext, 'resize');

    FakeResizeObserver.instances[0].trigger();
    flushLatestAnimationFrame();

    expect(resizeSpy).not.toHaveBeenCalled();
  });

  it('defers the actual resize to the next animation frame instead of doing it synchronously in the observer callback, since mutating the canvas synchronously in response to a ResizeObserver notification is what triggers the browser’s "ResizeObserver loop completed" error', () => {
    createContainerResizeSync(container, [renderContext]);

    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });

    const resizeSpy = vi.spyOn(renderContext, 'resize');

    FakeResizeObserver.instances[0].trigger();

    expect(resizeSpy).not.toHaveBeenCalled();

    flushLatestAnimationFrame();

    expect(resizeSpy).toHaveBeenCalledWith(800, 600, 1);
  });

  describe('device pixel ratio changes', () => {
    let mediaQueries: FakeMediaQueryList[];

    beforeEach(() => {
      mediaQueries = [];
      vi.stubGlobal('matchMedia', (query: string) => {
        const mediaQuery = new FakeMediaQueryList(query);

        mediaQueries.push(mediaQuery);

        return mediaQuery;
      });

      Object.defineProperty(container, 'clientWidth', { value: 800 });
      Object.defineProperty(container, 'clientHeight', { value: 600 });
    });

    it('watches a resolution media query for the current device pixel ratio', () => {
      vi.stubGlobal('devicePixelRatio', 1.5);
      createContainerResizeSync(container, [renderContext]);

      expect(mediaQueries).toHaveLength(1);
      expect(mediaQueries[0].media).toBe('(resolution: 1.5dppx)');
      expect(mediaQueries[0].listenerCount).toBe(1);
    });

    it("resizes at the new ratio when it changes, even though the container's size did not", () => {
      createContainerResizeSync(container, [renderContext]);

      vi.stubGlobal('devicePixelRatio', 2);
      mediaQueries[0].dispatchChange();

      const resizeSpy = vi.spyOn(renderContext, 'resize');

      flushLatestAnimationFrame();

      expect(resizeSpy).toHaveBeenCalledWith(800, 600, 2);
      expect(renderContext.width).toBe(1600);
    });

    it('re-arms the watch for the new ratio after every change', () => {
      createContainerResizeSync(container, [renderContext]);

      vi.stubGlobal('devicePixelRatio', 2);
      mediaQueries[0].dispatchChange();

      expect(mediaQueries).toHaveLength(2);
      expect(mediaQueries[0].listenerCount).toBe(0);
      expect(mediaQueries[1].media).toBe('(resolution: 2dppx)');
      expect(mediaQueries[1].listenerCount).toBe(1);
    });

    it('stops watching the ratio when stopped', () => {
      const resizeSync = createContainerResizeSync(container, [renderContext]);

      resizeSync.stop();

      expect(mediaQueries[0].listenerCount).toBe(0);
    });
  });

  it('disconnects the observer when stopped', () => {
    const resizeSync = createContainerResizeSync(container, [renderContext]);

    resizeSync.stop();

    expect(FakeResizeObserver.instances[0].disconnected).toBe(true);
  });

  it('stopping when there were no resizables does not throw', () => {
    const resizeSync = createContainerResizeSync(container, []);

    expect(() => resizeSync.stop()).not.toThrow();
    expect(FakeResizeObserver.instances).toHaveLength(0);
  });
});
