import {
  addPositionComponent,
  calculatePixelsPerUnit,
  Color,
  createCamera,
  createCanvas,
  createContainerResizeSync,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTransformEcsSystem,
  EcsWorld,
  MouseInputSource,
  positionId,
  registerInputs,
  screenToWorldSpace,
  spriteId,
  Time,
  Vector2,
} from '../../../src/index.js';
import { createWhiteSquareImage } from './create-white-square-image.js';
import { inputSceneColors } from './input-scene-colors.js';
import {
  matchesColor,
  PixelBounds,
  scanPixelBounds,
} from './input-scene-helpers.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;
const verticalWorldUnits = 10;
const squareWorldSize = 2;
// Off-center, so a pointer mapping that's off by the pixel ratio (which
// scales distances from the canvas center) lands visibly outside it.
const squareWorldCenter: Vector2 = { x: 3, y: 2 };

/** Converts a plain 0-255 RGB triple (see `input-scene-colors.ts`) to a `Color`. */
function toColor(rgb: { r: number; g: number; b: number }): Color {
  return new Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
}

/** The canvas's and render context's current sizes. */
export interface HighDpiCanvasMetrics {
  /** `canvas.width` - the drawing buffer's width, in device pixels. */
  drawingBufferWidth: number;
  /** `canvas.height` - the drawing buffer's height, in device pixels. */
  drawingBufferHeight: number;
  /** `canvas.clientWidth` - the canvas's laid-out width, in CSS pixels. */
  clientWidth: number;
  /** `canvas.clientHeight` - the canvas's laid-out height, in CSS pixels. */
  clientHeight: number;
  /** `RenderContext.pixelRatio`. */
  pixelRatio: number;
}

/** The handle `high-dpi-canvas.spec.ts` drives and asserts against. */
export interface HighDpiCanvasSceneHandle extends SceneHandle {
  readonly canvasMetrics: HighDpiCanvasMetrics;
  /** The landmark square's world-space center. */
  readonly squareWorldCenter: Vector2;
  /** The landmark square's side length, in world units. */
  readonly squareWorldSize: number;
  /**
   * How many drawing-buffer (device) pixels one world unit currently
   * occupies, per the camera's `verticalWorldUnits` and the drawing
   * buffer's height - i.e. what the render system itself draws with.
   */
  readonly devicePixelsPerUnit: number;
  /**
   * The mouse's position as of the last `step()`, converted to world space
   * from `MouseInputSource.position` (CSS pixels) against the render
   * context's CSS size.
   */
  readonly pointerWorldPosition: Vector2;
  /**
   * Scans the rendered canvas's drawing buffer for pixels matching
   * `targetRgb` and returns their bounding box, in device pixels. Must be
   * called in the same `page.evaluate` task as the preceding `step()`.
   */
  measureBounds(targetRgb: {
    r: number;
    g: number;
    b: number;
  }): PixelBounds | null;
}

/**
 * Builds a scene for checking the canvas renders at the display's device
 * pixel ratio: a canvas sized to its container through `createCanvas` and
 * `createRenderContext`, kept in sync by `createContainerResizeSync` (which
 * also re-sizes it when the device pixel ratio changes), a green landmark
 * square at a known world position, and a `MouseInputSource` whose
 * CSS-pixel position is converted to world space every frame.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<HighDpiCanvasSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  createContainerResizeSync(container, [renderContext]);

  const inputManager = registerInputs(world, time, {});
  const mouseInputSource = new MouseInputSource(inputManager, canvas);

  const cameraEntity = createCamera(world, {
    isStatic: true,
    clearColor: toColor(inputSceneColors.clear),
    verticalWorldUnits,
  });

  const squareImage = await createWhiteSquareImage();
  const squareSprite = createImageSprite(squareImage, renderContext, {
    pixelsPerUnit: 1,
  });
  const square = world.createEntity();

  addPositionComponent(world, square, {
    local: { ...squareWorldCenter },
  });
  world.addComponent(square, spriteId, {
    ...squareSprite,
    width: squareWorldSize,
    height: squareWorldSize,
    tintColor: toColor(inputSceneColors.green),
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;
  let pointerWorldPosition: Vector2 = { x: 0, y: 0 };

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();

      const cameraPosition = world.getComponent(cameraEntity, positionId);

      if (!cameraPosition) {
        throw new Error('The scene camera has no position component.');
      }

      pointerWorldPosition = screenToWorldSpace(
        mouseInputSource.position,
        cameraPosition.world,
        1,
        renderContext.cssWidth,
        renderContext.cssHeight,
        calculatePixelsPerUnit(renderContext.cssHeight, verticalWorldUnits),
      );
    },

    get canvasMetrics(): HighDpiCanvasMetrics {
      return {
        drawingBufferWidth: canvas.width,
        drawingBufferHeight: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        pixelRatio: renderContext.pixelRatio,
      };
    },

    squareWorldCenter,
    squareWorldSize,

    get devicePixelsPerUnit(): number {
      return calculatePixelsPerUnit(renderContext.height, verticalWorldUnits);
    },

    get pointerWorldPosition(): Vector2 {
      return pointerWorldPosition;
    },

    measureBounds(targetRgb: {
      r: number;
      g: number;
      b: number;
    }): PixelBounds | null {
      return scanPixelBounds(canvas, matchesColor(targetRgb));
    },
  };
};
