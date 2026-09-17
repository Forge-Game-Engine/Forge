import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('createContainerResizeSync', () => {
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

    expect(resizeSpy).toHaveBeenCalledWith(800, 600);
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

    expect(resizeSpy).toHaveBeenCalledWith(800, 600);
    expect(secondResizable.resize).toHaveBeenCalledWith(800, 600);
  });

  it("does not resize when the container reports a resizable's current size", () => {
    createContainerResizeSync(container, [renderContext]);

    Object.defineProperty(container, 'clientWidth', {
      value: renderContext.width,
    });
    Object.defineProperty(container, 'clientHeight', {
      value: renderContext.height,
    });

    const resizeSpy = vi.spyOn(renderContext, 'resize');

    FakeResizeObserver.instances[0].trigger();
    flushLatestAnimationFrame();

    expect(resizeSpy).not.toHaveBeenCalled();
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

    expect(resizeSpy).toHaveBeenCalledWith(800, 600);
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
