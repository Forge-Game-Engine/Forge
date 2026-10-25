import {
  addPositionComponent,
  Axis1dAction,
  Color,
  createCamera,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTransformEcsSystem,
  EcsWorld,
  KeyboardAxis1dBinding,
  KeyboardInputSource,
  keyCodes,
  registerFixedUpdate,
  registerInputs,
  spriteId,
  Time,
} from '../../../src/index.js';
import {
  matchesColor,
  PixelBounds,
  scanPixelBounds,
} from './input-scene-helpers.js';
import { inputSceneColors } from './input-scene-colors.js';
import { CreateScene, SceneHandle } from './scene.js';

const squareSize = 60;
const speedInWorldUnitsPerSecond = 300;

/** Converts a plain 0-255 RGB triple (see `input-scene-colors.ts`) to a `Color`. */
function toColor(rgb: { r: number; g: number; b: number }): Color {
  return new Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
}

/** The handle `fixed-update.spec.ts` drives and asserts against. */
export interface FixedUpdateSceneHandle extends SceneHandle {
  /** The square's local x, moved only by the fixed-update system. */
  readonly moverX: number;
  /** How many fixed steps ran in the latest `step()`. */
  readonly fixedStepsLastFrame: number;
  /**
   * How many fixed steps of the latest `step()` had run when the default
   * group's system ran.
   */
  readonly fixedStepsBeforeDefaultGroup: number;
  /** The fixed delta time, in seconds. */
  readonly fixedDeltaTimeInSeconds: number;
  /**
   * Scans the rendered canvas for the square's blue pixels. Must be called
   * in the same `page.evaluate` task as the preceding `step()`.
   */
  measureMoverBounds(): PixelBounds | null;
}

/**
 * Builds a scene whose only moving square is moved by a system in the
 * `registerFixedUpdate` group, while a keyboard `Axis1dAction` (D / A) is
 * held. Frames of different lengths run different numbers of fixed steps,
 * and the square moves by the fixed delta times the speed once per step.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): FixedUpdateSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const moveAction = new Axis1dAction('move', 'game');
  const fixedUpdate = registerFixedUpdate(world, time);
  // Registered after `registerFixedUpdate` on purpose: the input update runs
  // in the first group, so fixed steps read this frame's input whichever was
  // registered first.
  const inputManager = registerInputs(world, time, {
    axis1dActions: [moveAction],
  });
  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(moveAction, keyCodes.d, keyCodes.a),
  );

  createCamera(world, {
    isStatic: true,
    clearColor: toColor(inputSceneColors.clear),
    // 1 world unit == 1 screen pixel, see camera-pan-zoom.ts's identical use.
    verticalWorldUnits: canvas.height,
  });

  const mover = world.createEntity();
  const moverPosition = addPositionComponent(world, mover, {
    local: { x: -300, y: 0 },
  });

  world.addComponent(mover, spriteId, {
    ...createImageSprite(renderContext.whiteTexture),
    width: squareSize,
    height: squareSize,
    tintColor: toColor(inputSceneColors.blue),
  });

  let fixedStepsLastFrame = 0;
  let fixedStepsBeforeDefaultGroup = 0;

  world.addSystem(
    {
      name: 'fixed-mover',
      query: [],
      update: (): void => {
        fixedStepsLastFrame++;
        moverPosition.local.x +=
          moveAction.value *
          speedInWorldUnitsPerSecond *
          time.deltaTimeInSeconds;
      },
    },
    { group: fixedUpdate },
  );

  world.addSystem({
    name: 'default-group-probe',
    query: [],
    update: (): void => {
      fixedStepsBeforeDefaultGroup = fixedStepsLastFrame;
    },
  });
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  time.update(clockInMilliseconds);

  return {
    step(deltaMilliseconds: number = 1000 / 60): void {
      fixedStepsLastFrame = 0;
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get moverX(): number {
      return moverPosition.local.x;
    },

    get fixedStepsLastFrame(): number {
      return fixedStepsLastFrame;
    },

    get fixedStepsBeforeDefaultGroup(): number {
      return fixedStepsBeforeDefaultGroup;
    },

    get fixedDeltaTimeInSeconds(): number {
      return time.fixedDeltaTimeInSeconds;
    },

    measureMoverBounds(): PixelBounds | null {
      return scanPixelBounds(canvas, matchesColor(inputSceneColors.blue));
    },
  };
};
