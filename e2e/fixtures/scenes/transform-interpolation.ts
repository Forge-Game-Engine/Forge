import {
  addPositionComponent,
  addRigidBodyComponent,
  addRotationComponent,
  Color,
  createCamera,
  createCameraEcsSystem,
  createCanvas,
  createEulerIntegrationEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  EcsWorld,
  PositionEcsComponent,
  registerFixedUpdate,
  spriteId,
  Time,
  transformInterpolationId,
} from '../../../src/index.js';
import {
  matchesColor,
  PixelBounds,
  scanPixelBounds,
} from './input-scene-helpers.js';
import { inputSceneColors } from './input-scene-colors.js';
import { CreateScene, SceneHandle } from './scene.js';

const squareSize = 30;
const startX = -150;
// 16 world units (CSS pixels) per fixed step.
const speed = 512;
// A fixed step of 31.25 ms: the spec's 7.8125 ms frames run one step on
// every fourth frame. Both are exact in binary, so the overstep fraction
// is exactly 0, 0.25, 0.5 or 0.75 after each frame.
const fixedDeltaTimeInMilliseconds = 1000 / 32;

/** Converts a plain 0-255 RGB triple (see `input-scene-colors.ts`) to a `Color`. */
function toColor(rgb: { r: number; g: number; b: number }): Color {
  return new Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
}

/** A body's simulated and drawn X. */
export interface BodyState {
  readonly localX: number;
  readonly worldX: number;
}

/** The handle `transform-interpolation.spec.ts` drives and asserts against. */
export interface TransformInterpolationSceneHandle extends SceneHandle {
  /** The interpolated (blue) body. */
  readonly interpolated: BodyState;
  /** The (magenta) body drawn at its simulated pose. */
  readonly stepped: BodyState;
  /**
   * Scans the rendered canvas for both bodies. Must be called in the same
   * `page.evaluate` task as the preceding `step()`.
   */
  measureBounds(): {
    interpolated: PixelBounds | null;
    stepped: PixelBounds | null;
  };
}

/**
 * Builds a scene where two kinematic bodies move right at the same constant
 * velocity, in fixed steps of 31.25 ms. The upper (blue) one keeps the
 * `TransformInterpolationEcsComponent` `addRigidBodyComponent` gives it, so
 * it's drawn between its last two steps; the lower (magenta) one has it
 * removed, so it's drawn where each step leaves it.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): TransformInterpolationSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  time.fixedDeltaTimeInMilliseconds = fixedDeltaTimeInMilliseconds;

  createCamera(world, {
    isStatic: true,
    clearColor: toColor(inputSceneColors.clear),
    // 1 world unit == 1 screen pixel, see camera-pan-zoom.ts's identical use.
    verticalWorldUnits: canvas.height,
  });

  const addBody = (
    y: number,
    color: { r: number; g: number; b: number },
  ): { entity: number; position: PositionEcsComponent } => {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: startX, y },
    });

    addRotationComponent(world, entity);
    world.addComponent(entity, spriteId, {
      ...createImageSprite(renderContext.whiteTexture),
      width: squareSize,
      height: squareSize,
      tintColor: toColor(color),
    });
    addRigidBodyComponent(world, entity, {
      type: 'kinematic',
      velocity: { x: speed, y: 0 },
    });

    return { entity, position };
  };

  const interpolated = addBody(-50, inputSceneColors.blue);
  const stepped = addBody(50, inputSceneColors.magenta);

  world.removeComponent(stepped.entity, transformInterpolationId);

  const physics = { group: registerFixedUpdate(world, time) };

  // Once per fixed step.
  world.addSystem(createTransformEcsSystem(time), physics);
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createTransformInterpolationEcsSystem(), physics);

  // Once per frame, after the fixed steps.
  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  time.update(clockInMilliseconds);

  const bodyState = (position: PositionEcsComponent): BodyState => ({
    localX: position.local.x,
    worldX: position.world.x,
  });

  return {
    step(deltaMilliseconds: number = fixedDeltaTimeInMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get interpolated(): BodyState {
      return bodyState(interpolated.position);
    },

    get stepped(): BodyState {
      return bodyState(stepped.position);
    },

    measureBounds() {
      return {
        interpolated: scanPixelBounds(
          canvas,
          matchesColor(inputSceneColors.blue),
        ),
        stepped: scanPixelBounds(
          canvas,
          matchesColor(inputSceneColors.magenta),
        ),
      };
    },
  };
};
