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
  createTransformEcsSystem,
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

// A distinctive, opaque clear color for the camera.
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
// moved or not.
const gridExtentInCells = 3;
const cellSpacing = 100;
const cellSize = 80;

function cellTintColor(gridX: number, gridY: number): Color {
  if (gridX === 0 && gridY === 0) {
    return Color.green;
  }

  return (gridX + gridY) % 2 === 0 ? Color.red : Color.blue;
}

// Generous thresholds, not exact equality: SwiftShader/antialiasing rounding
// means edge pixels blend toward neighboring colors, and this only needs to
// distinguish "green" from "the red/blue/clear-color palette", not match an
// exact byte value.
function isGreenish(r: number, g: number, b: number): boolean {
  return g > 150 && r < 100 && b < 100;
}

/** The horizontal pixel extent of the green origin square, as rendered. */
export interface GreenSquareBounds {
  /** The leftmost on-screen x pixel where the green square was found. */
  left: number;
  /** The rightmost on-screen x pixel where the green square was found. */
  right: number;
}

/** The handle `camera-pan-zoom.spec.ts` drives and asserts against. */
export interface CameraSceneHandle extends SceneHandle {
  /** The camera's current zoom level (see `CameraEcsComponent.zoom`). */
  readonly zoom: number;
  /** The camera's current local position. */
  readonly position: { x: number; y: number };

  /**
   * Scans a horizontal line through the vertical center of the canvas's
   * *actual displayed bitmap* (`drawImage`/`getImageData`, not
   * `gl.readPixels` - see AGENTS.md's "Be wary of pixel-level rendering
   * assertions") for pixels matching the green origin square's tint, and
   * returns the leftmost/rightmost match. Returns `null` if no matching
   * pixel is found on that line (e.g. panned far enough that the square is
   * fully off-screen). This is what lets a spec assert on what's actually
   * rendered - a sprite's on-screen size/position - rather than only the
   * ECS state that's supposed to produce it. Must be called in the same
   * `page.evaluate` task as the preceding `step()` - see `SceneHandle.step`.
   */
  measureGreenSquareBounds(): GreenSquareBounds | null;
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
  // `measureGreenSquareBounds` below reads the canvas back well after the
  // frame that drew it has been presented (real animation frames spaced
  // over wall-clock time in the spec's `animateFrames`), not just
  // synchronously after drawing it - without `preserveDrawingBuffer`, the
  // browser is allowed to clear the drawing buffer as soon as the frame is
  // presented, and a headless CI SwiftShader build was observed doing
  // exactly that (see AGENTS.md's "Be wary of pixel-level rendering
  // assertions").
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

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
  // createCameraEcsSystem only updates the camera's local position/zoom;
  // createRenderEcsSystem reads its *world* position for the projection
  // matrix. Without this, panning changes `position.local` (which is what
  // camera.position below reads) but the camera visibly never moves -
  // exactly the kind of bug a numeric-only assertion can't catch. Must run
  // after the system above and before the one below.
  world.addSystem(createTransformEcsSystem());
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

    measureGreenSquareBounds(): GreenSquareBounds | null {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const y = Math.floor(canvas.height / 2);
      const { data } = context2d.getImageData(0, y, canvas.width, 1);

      let left = -1;
      let right = -1;

      for (let x = 0; x < canvas.width; x++) {
        const offset = x * 4;

        if (isGreenish(data[offset], data[offset + 1], data[offset + 2])) {
          if (left === -1) {
            left = x;
          }

          right = x;
        }
      }

      if (left === -1) {
        return null;
      }

      return { left, right };
    },
  };
};
