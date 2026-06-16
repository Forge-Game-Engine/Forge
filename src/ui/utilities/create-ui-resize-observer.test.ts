import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { uiCanvasId } from '../components/ui-canvas-component';
import { createUiCanvas } from './create-ui-canvas';
import { createUiResizeObserver } from './create-ui-resize-observer';

// ResizeObserver is not available in jsdom — install a class-based mock.
let capturedCallback: ResizeObserverCallback | null = null;
let lastObserveElement: Element | null = null;

const observeSpy = vi.fn((el: Element) => {
  lastObserveElement = el;
});
const unobserveSpy = vi.fn();
const disconnectSpy = vi.fn();

class MockResizeObserver {
  public observe = observeSpy;
  public unobserve = unobserveSpy;
  public disconnect = disconnectSpy;

  constructor(callback: ResizeObserverCallback) {
    capturedCallback = callback;
  }
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

function fireResize(width: number, height: number): void {
  if (!capturedCallback || !lastObserveElement) {
    throw new Error(
      'ResizeObserver not initialised — was createUiResizeObserver called?',
    );
  }

  capturedCallback(
    [
      {
        contentRect: {
          width,
          height,
          top: 0,
          left: 0,
          right: width,
          bottom: height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRectReadOnly,
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
        target: lastObserveElement,
      } as ResizeObserverEntry,
    ],
    new MockResizeObserver(capturedCallback) as unknown as ResizeObserver,
  );
}

describe('createUiResizeObserver', () => {
  let world: EcsWorld;
  let canvasEntity: number;
  let element: HTMLElement;

  beforeEach(() => {
    world = new EcsWorld();
    canvasEntity = createUiCanvas(world, { width: 800, height: 600 });
    element = document.createElement('div');
    capturedCallback = null;
    lastObserveElement = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('updates UiCanvasEcsComponent dimensions on resize', () => {
    createUiResizeObserver(element, canvasEntity, world);
    fireResize(1024, 768);

    const canvas = world.getComponent(canvasEntity, uiCanvasId);

    expect(canvas?.width).toBe(1024);
    expect(canvas?.height).toBe(768);
  });

  it('marks the canvas dirty on resize', () => {
    const canvas = world.getComponent(canvasEntity, uiCanvasId)!;

    canvas.isDirty = false;

    createUiResizeObserver(element, canvasEntity, world);
    fireResize(400, 300);

    expect(canvas.isDirty).toBe(true);
  });

  it('emits the onResize event with the new dimensions', () => {
    const observer = createUiResizeObserver(element, canvasEntity, world);
    const listener = vi.fn();

    observer.onResize.registerListener(listener);
    fireResize(1280, 720);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ width: 1280, height: 720 });
  });

  it('emits the event once per ResizeObserver callback (coalescing)', () => {
    const observer = createUiResizeObserver(element, canvasEntity, world);
    const listener = vi.fn();

    observer.onResize.registerListener(listener);

    // The browser batches multiple DOM size changes into one ResizeObserver
    // callback per animation frame, so a single fireResize call simulates
    // one already-coalesced notification.
    fireResize(640, 480);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('stop() calls unobserve and disconnect on the underlying observer', () => {
    const observer = createUiResizeObserver(element, canvasEntity, world);

    observer.stop();

    expect(unobserveSpy).toHaveBeenCalledWith(element);
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
