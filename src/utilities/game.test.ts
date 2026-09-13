import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageCache } from '../asset-loading/index.js';
import { Time } from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import { RenderContext } from '../rendering/index.js';
import { ShaderCache } from '../rendering/shaders/index.js';
import { Game } from './game.js';

/**
 * jsdom doesn't implement `ResizeObserver`, so tests that exercise resize
 * handling install this stand-in on the global before constructing a
 * `Game`. It records the observed element and lets a test trigger a resize
 * callback manually, rather than relying on a real layout engine.
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

describe('Game', () => {
  let time: Time;
  let world: EcsWorld;
  let container: HTMLElement;
  let game: Game;
  let rafCallback: FrameRequestCallback | null;

  beforeEach(() => {
    time = new Time();
    world = new EcsWorld();
    container = document.createElement('div');
    game = new Game(time, world, container);

    rafCallback = null;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallback = callback;

      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('updates time with its own performance.now() reading rather than the requestAnimationFrame timestamp argument', () => {
    const updateSpy = vi.spyOn(time, 'update');

    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000);

    game.run();

    expect(updateSpy).toHaveBeenCalledWith(1000);
    expect(rafCallback).not.toBeNull();

    // requestAnimationFrame's own timestamp argument isn't guaranteed to be
    // monotonic relative to a prior performance.now() reading. Invoking the
    // scheduled frame with an arbitrary value here proves the loop ignores
    // it in favor of reading performance.now() itself.
    rafCallback?.(999_999);

    expect(updateSpy).toHaveBeenCalledWith(2000);
    expect(updateSpy).not.toHaveBeenCalledWith(999_999);
  });

  describe('resize handling', () => {
    let renderContext: RenderContext;

    beforeEach(() => {
      FakeResizeObserver.instances.length = 0;
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);

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

    it('does not observe the container when constructed without a render context', () => {
      game.run();

      expect(FakeResizeObserver.instances).toHaveLength(0);
    });

    it('observes the container for size changes when constructed with a render context', () => {
      game = new Game(time, world, container, renderContext);

      game.run();

      expect(FakeResizeObserver.instances).toHaveLength(1);
      expect(FakeResizeObserver.instances[0].observedElement).toBe(container);
    });

    it("resizes the render context to the container's current size when the container resizes", () => {
      game = new Game(time, world, container, renderContext);

      Object.defineProperty(container, 'clientWidth', { value: 800 });
      Object.defineProperty(container, 'clientHeight', { value: 600 });

      game.run();

      const resizeSpy = vi.spyOn(renderContext, 'resize');

      FakeResizeObserver.instances[0].trigger();

      expect(resizeSpy).toHaveBeenCalledWith(800, 600);
    });

    it('does not resize when the container reports the render context’s current size', () => {
      game = new Game(time, world, container, renderContext);

      Object.defineProperty(container, 'clientWidth', {
        value: renderContext.width,
      });
      Object.defineProperty(container, 'clientHeight', {
        value: renderContext.height,
      });

      game.run();

      const resizeSpy = vi.spyOn(renderContext, 'resize');

      FakeResizeObserver.instances[0].trigger();

      expect(resizeSpy).not.toHaveBeenCalled();
    });

    it('does not resize when the container is momentarily zero-sized', () => {
      game = new Game(time, world, container, renderContext);

      Object.defineProperty(container, 'clientWidth', { value: 0 });
      Object.defineProperty(container, 'clientHeight', { value: 0 });

      game.run();

      const resizeSpy = vi.spyOn(renderContext, 'resize');

      FakeResizeObserver.instances[0].trigger();

      expect(resizeSpy).not.toHaveBeenCalled();
    });

    it('disconnects the resize observer when stopped', () => {
      game = new Game(time, world, container, renderContext);

      game.run();
      game.stop();

      expect(FakeResizeObserver.instances[0].disconnected).toBe(true);
    });

    it('stopping without having run does not throw, since there is no resize observer to disconnect', () => {
      game = new Game(time, world, container, renderContext);

      expect(() => game.stop()).not.toThrow();
      expect(FakeResizeObserver.instances).toHaveLength(0);
    });
  });
});
