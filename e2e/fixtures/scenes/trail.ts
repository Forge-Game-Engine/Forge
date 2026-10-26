import {
  addPositionComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addCameraComponent,
  addSpriteComponent,
  addTrailComponent,
  Color,
  createCanvas,
  createImageSprite,
  createRenderContext,
  createRenderEcsSystem,
  createTrailEcsSystem,
  TrailEcsComponent,
  trailId,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';
import {
  trailLifetimeSeconds,
  trailSpeed,
  trailSpriteWidth,
} from './trail-settings.js';

const defaultStepDeltaMilliseconds = 16.6666;
const verticalWorldUnits = 10;

/** Where the entity starts, in world units: left of the canvas's center. */
const startX = -4;

/** A horizontal run of pixels, in canvas pixels from the left, inclusive. */
export interface PixelExtent {
  left: number;
  right: number;
}

/** What `trail.spec.ts` asserts against, from one frame. */
export interface TrailMeasurement {
  /** The trail's pixels along the entity's row, or `null` for none. */
  red: PixelExtent | null;

  /** The entity's sprite's pixels along its row, or `null` for none. */
  blue: PixelExtent | null;

  /** The entity's world x. */
  entityX: number;
}

/** The handle `trail.spec.ts` drives and asserts against. */
export interface TrailSceneHandle extends SceneHandle {
  /**
   * Steps frames of `deltaMilliseconds` until `seconds` of game time have
   * passed, moving the entity along `+X` at `trailSpeed`.
   */
  run(seconds: number, deltaMilliseconds: number): void;

  /** Sets the trail's `emitting`. */
  setEmitting(emitting: boolean): void;

  /** Removes the trail component from the entity. */
  removeTrail(): void;

  /**
   * Finds the trail and the sprite along the entity's row of the canvas's
   * displayed bitmap. Must be called in the same `page.evaluate` task as
   * the preceding `step()` or `run()`.
   */
  measure(): TrailMeasurement;
}

type SampledShape = 'red' | 'blue' | 'other';

const classify = (r: number, g: number, b: number): SampledShape => {
  if (r > 200 && g < 80 && b < 80) {
    return 'red';
  }

  if (b > 200 && r < 80 && g < 80) {
    return 'blue';
  }

  return 'other';
};

/**
 * Builds a minimal scene for trails: a white background and an entity with
 * a small blue sprite and an opaque red trail of constant width, moved
 * along `+X` at a constant speed by `step`. The trail draws through a mesh
 * on the sprite's own entity, so it shows behind the sprite.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): TrailSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 800;
  canvas.height = 600;

  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity);
  addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: Color.white,
    verticalWorldUnits,
  });

  const entity = world.createEntity();
  const position: PositionEcsComponent = addPositionComponent(world, entity, {
    local: { x: startX, y: 0 },
  });

  addSpriteComponent(world, entity, {
    ...createImageSprite(renderContext.whiteTexture),
    width: trailSpriteWidth,
    height: trailSpriteWidth,
    tintColor: new Color(0, 0, 1, 1),
  });

  const trail: TrailEcsComponent = addTrailComponent(world, entity, {
    lifetimeSeconds: trailLifetimeSeconds,
    minVertexDistance: 0.05,
    startWidth: 0.3,
    endWidth: 0.3,
    startColor: new Color(1, 0, 0, 1),
    endColor: new Color(1, 0, 0, 1),
  });

  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createTrailEcsSystem(time, renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  time.update(clockInMilliseconds);

  const step = (
    deltaMilliseconds: number = defaultStepDeltaMilliseconds,
  ): void => {
    clockInMilliseconds += deltaMilliseconds;
    time.update(clockInMilliseconds);
    // Game logic: move the entity before the transform system runs.
    position.local.x += trailSpeed * time.deltaTimeInSeconds;
    world.update();
  };

  return {
    step,

    run(seconds: number, deltaMilliseconds: number): void {
      const frames = Math.round((seconds * 1000) / deltaMilliseconds);

      for (let frame = 0; frame < frames; frame++) {
        step(deltaMilliseconds);
      }
    },

    setEmitting(emitting: boolean): void {
      trail.emitting = emitting;
    },

    removeTrail(): void {
      world.removeComponent(entity, trailId);
    },

    measure(): TrailMeasurement {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const row = Math.round(canvas.height / 2);
      const { data } = context2d.getImageData(0, row, canvas.width, 1);
      const extents: Record<SampledShape, PixelExtent | null> = {
        red: null,
        blue: null,
        other: null,
      };

      for (let x = 0; x < canvas.width; x++) {
        const offset = x * 4;
        const shape = classify(
          data[offset],
          data[offset + 1],
          data[offset + 2],
        );
        const extent = extents[shape];

        if (extent) {
          extent.right = x;
        } else {
          extents[shape] = { left: x, right: x };
        }
      }

      return {
        red: extents.red,
        blue: extents.blue,
        entityX: position.world.x,
      };
    },
  };
};
