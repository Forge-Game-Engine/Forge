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
  Time,
} from '../../../src/index.js';
import { clearColorRgb } from './camera-pan-zoom-clear-color.js';
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

/** The handle `camera-pan-zoom.spec.ts` drives and asserts against. */
export interface CameraSceneHandle extends SceneHandle {
  /** The camera's current zoom level (see `CameraEcsComponent.zoom`). */
  readonly zoom: number;
  /** The camera's current local position. */
  readonly position: { x: number; y: number };

  /**
   * Reads back the canvas's center pixel via `gl.readPixels`, as
   * `[r, g, b, a]` bytes. Must be called in the same task as `step()` (a
   * single `page.evaluate`) - the WebGL2 context isn't created with
   * `preserveDrawingBuffer`, so the browser is free to clear the drawing
   * buffer as soon as control returns to it after a frame is presented.
   */
  readCenterPixel(): [number, number, number, number];
}

/**
 * Builds a minimal scene with a single, non-static camera whose zoom and pan
 * are wired to real input: mouse wheel for zoom (`MouseAxis1dBinding`) and
 * arrow keys for pan (`KeyboardAxis2dBinding`) - the same bindings a real
 * game would register via `registerInputs`.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): CameraSceneHandle => {
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

    readCenterPixel(): [number, number, number, number] {
      const { gl } = renderContext;
      const rgba = new Uint8Array(4);

      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rgba,
      );

      return [rgba[0], rgba[1], rgba[2], rgba[3]];
    },
  };
};
