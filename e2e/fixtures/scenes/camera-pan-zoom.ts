import {
  actionResetTypes,
  Axis1dAction,
  Axis2dAction,
  CameraEcsComponent,
  cameraId,
  Color,
  createCamera,
  createCameraEcsSystem,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  EcsWorld,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  keyCodes,
  MouseAxis1dBinding,
  MouseInputSource,
  PositionEcsComponent,
  positionId,
  registerInputs,
  spriteId,
  Time,
  Vector2,
} from '../../../src/index.js';
import { clearColorRgb } from './camera-pan-zoom-clear-color.js';
import { createWhiteSquareImage } from './create-white-square-image.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// A distinctive, opaque clear color so a spec can screenshot the canvas and
// confirm the real WebGL2 render pipeline actually ran a frame, without
// needing any sprite/image assets.
const clearColor = new Color(
  clearColorRgb.r,
  clearColorRgb.g,
  clearColorRgb.b,
  1,
);

// A checkerboard of tinted squares (see `createWhiteSquareImage`), spanning
// world coordinates [-300, 300] on both axes, with a distinct green marker
// at the origin. This is what makes a recording of the suite (`video: 'on'`
// in playwright.config.ts) actually show the camera panning/zooming,
// instead of a flat clear color that looks identical whether the camera
// moved or not. Sized well within the fixture's 800x600 canvas at the
// default zoom, so every canvas corner stays outside the grid - see
// `readBackgroundPixel`.
const gridExtentInCells = 3;
const cellSpacing = 100;
const cellSize = 80;

function cellTintColor(gridX: number, gridY: number): Color {
  if (gridX === 0 && gridY === 0) {
    return Color.green;
  }

  return (gridX + gridY) % 2 === 0 ? Color.red : Color.blue;
}

/** The handle `camera-pan-zoom.spec.ts` drives and asserts against. */
export interface CameraSceneHandle extends SceneHandle {
  /** The camera's current zoom level (see `CameraEcsComponent.zoom`). */
  readonly zoom: number;
  /** The camera's current local position. */
  readonly position: { x: number; y: number };

  /**
   * Reads back a pixel from a canvas corner - always outside the grid (see
   * the module-level comment above `gridExtentInCells`), so it reflects the
   * camera's clear color regardless of pan/zoom - as `[r, g, b, a]` bytes.
   * Samples through `drawImage`/`getImageData` against the canvas's actual
   * displayed bitmap (top-left origin, like a screenshot), deliberately not
   * `gl.readPixels`: the latter proved unreliable against this canvas's
   * antialiased default framebuffer under CI's specific SwiftShader build
   * (returned the same wrong color for every coordinate, including ones
   * confirmed correct locally). Must be called in the same task as `step()`
   * (a single `page.evaluate`) - the WebGL2 context isn't created with
   * `preserveDrawingBuffer`, so the browser is free to clear the drawing
   * buffer as soon as control returns to it after a frame is presented.
   */
  readBackgroundPixel(): [number, number, number, number];

  // TEMPORARY - see the implementation.
  readColorHistogram(): Record<string, number>;
}

/**
 * Builds a minimal scene with a single, non-static camera whose zoom and pan
 * are wired to real input: mouse wheel for zoom (`MouseAxis1dBinding`) and
 * arrow keys for pan (`KeyboardAxis2dBinding`) - the same bindings a real
 * game would register via `registerInputs`. A checkerboard grid of tinted
 * squares gives pan/zoom something visible to move against.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<CameraSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas);

  const zoomInput = new Axis1dAction('zoom');
  // Arrow keys are held down for the duration of a pan, so the action must
  // keep its value between frames instead of the default reset-to-zero.
  // `inputGroup` is left undefined (-> the InputManager's default 'game'
  // group) so real keyboard events actually reach it - the InputManager
  // only dispatches to actions whose group matches its active group.
  const panInput = new Axis2dAction('pan', undefined, actionResetTypes.noReset);

  const inputManager = registerInputs(world, time, {
    axis1dActions: [zoomInput],
    axis2dActions: [panInput],
  });

  const mouseInputSource = new MouseInputSource(inputManager, canvas);

  mouseInputSource.axis1dBindings.add(new MouseAxis1dBinding(zoomInput));

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      panInput,
      keyCodes.arrowUp,
      keyCodes.arrowDown,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  const cameraEntity = createCamera(world, {
    zoomInput,
    panInput,
    minZoom: 0.1,
    maxZoom: 10,
    clearColor,
  });

  // `1`, not `0`: this is a culling-mask *category* bit (matched against the
  // camera's `cullingMask` via bitwise AND), not a draw-order layer - a
  // category of `0` can never match any mask and would silently render
  // nothing.
  const squareImage = await createWhiteSquareImage();
  const squareSprite = createImageSprite(squareImage, renderContext, 1);

  for (let gridX = -gridExtentInCells; gridX <= gridExtentInCells; gridX++) {
    for (let gridY = -gridExtentInCells; gridY <= gridExtentInCells; gridY++) {
      const cellEntity = world.createEntity();
      const cellPosition = new Vector2(
        gridX * cellSpacing,
        gridY * cellSpacing,
      );

      world.addComponent(cellEntity, positionId, {
        world: cellPosition.clone(),
        local: cellPosition.clone(),
      });

      world.addComponent(cellEntity, spriteId, {
        ...squareSprite,
        width: cellSize,
        height: cellSize,
        tintColor: cellTintColor(gridX, gridY),
      });
    }
  }

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get zoom(): number {
      return world.getComponent<CameraEcsComponent>(cameraEntity, cameraId)!
        .zoom;
    },

    get position(): { x: number; y: number } {
      const position = world.getComponent<PositionEcsComponent>(
        cameraEntity,
        positionId,
      )!;

      return { x: position.local.x, y: position.local.y };
    },

    readBackgroundPixel(): [number, number, number, number] {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const { data } = context2d.getImageData(5, 5, 1, 1);

      return [data[0], data[1], data[2], data[3]];
    },

    // TEMPORARY: fingerprints what's actually rendered across the whole
    // canvas (both readback methods have returned the same wrong single
    // color for every coordinate tried so far, in CI only) without needing
    // to download a binary video/screenshot artifact. Remove once
    // root-caused.
    readColorHistogram(): Record<string, number> {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const { data } = context2d.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const bucketFor = (r: number, g: number, b: number): string => {
        if (r > 200 && g < 50 && b < 50) {
          return 'red';
        }

        if (r < 50 && g < 50 && b > 200) {
          return 'blue';
        }

        if (r < 50 && g > 200 && b < 50) {
          return 'green';
        }

        if (r < 80 && g < 130 && g > 70 && b > 180) {
          return 'clearColor';
        }

        return `other(${r},${g},${b})`;
      };

      const histogram: Record<string, number> = {};
      const sampleStride = 10;

      for (let y = 0; y < canvas.height; y += sampleStride) {
        for (let x = 0; x < canvas.width; x += sampleStride) {
          const index = (y * canvas.width + x) * 4;
          const bucket = bucketFor(
            data[index],
            data[index + 1],
            data[index + 2],
          );

          histogram[bucket] = (histogram[bucket] ?? 0) + 1;
        }
      }

      return histogram;
    },
  };
};
