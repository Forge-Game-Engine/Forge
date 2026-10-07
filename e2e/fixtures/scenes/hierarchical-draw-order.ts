import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addCameraComponent,
  addDrawOrderComponent,
  addSpriteComponent,
  Color,
  createCanvas,
  createImageSprite,
  createRenderContext,
  createRenderEcsSystem,
  DrawOrderEcsComponent,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;
const verticalWorldUnits = 10;

/** Which of the scene's sprites a sampled pixel shows, by its dominant channel. */
export type SampledSprite = 'rock' | 'ship' | 'flame' | 'background';

/** What `hierarchical-draw-order.spec.ts` asserts against, from one frame. */
export interface HierarchicalDrawOrderMeasurement {
  /** Where the ship and its flame overlap. */
  shipAndFlame: SampledSprite;

  /** Where the rock and the flame overlap. */
  rockAndFlame: SampledSprite;

  /** The flame's own `DrawOrderEcsComponent.order`, read back from the ECS. */
  flameOrder: number;
}

/** The handle `hierarchical-draw-order.spec.ts` drives and asserts against. */
export interface HierarchicalDrawOrderSceneHandle extends SceneHandle {
  /** Sets the flame's `DrawOrderEcsComponent.order`. */
  setFlameOrder(order: number): void;

  /**
   * Samples the overlaps from the canvas's displayed bitmap. Must be called
   * in the same `page.evaluate` task as the preceding `step()`.
   */
  measure(): HierarchicalDrawOrderMeasurement;
}

const classify = (r: number, g: number, b: number): SampledSprite => {
  if (r > 200 && g > 200 && b > 200) {
    return 'background';
  }

  if (r >= g && r >= b) {
    return 'ship';
  }

  return g >= b ? 'flame' : 'rock';
};

/**
 * Builds a minimal scene for hierarchical draw order: a blue rock, created
 * first, then a red ship with a green engine flame parented to it, which
 * overlaps both. With an `order` of `-1`, the flame draws behind every
 * entity at its ship's level, so both overlaps show the other sprite. With
 * `0`, it draws after its parent, and after the rock created before it, so
 * it covers both overlaps.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<HierarchicalDrawOrderSceneHandle> => {
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

  const addSquare = (x: number, color: Color): number => {
    const entity = world.createEntity();
    addPositionComponent(world, entity, { local: { x, y: 0 } });
    addSpriteComponent(world, entity, {
      ...createImageSprite(renderContext.whiteTexture),
      width: 2,
      height: 2,
      tintColor: color,
    });

    return entity;
  };

  // Each square is 2 world units wide: the rock spans x in [-3, -1], the
  // ship [-1, 1], and the flame (1 unit left of the ship) [-2, 0].
  addSquare(-2, new Color(0, 0, 1, 1));
  const ship = addSquare(0, new Color(1, 0, 0, 1));
  // `setParent` keeps the local position, so it's now relative to the ship.
  const flame = addSquare(-1, new Color(0, 1, 0, 1));

  world.setParent(flame, ship);

  const flameOrder: DrawOrderEcsComponent = addDrawOrderComponent(
    world,
    flame,
    { order: -1 },
  );

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    setFlameOrder(order: number): void {
      flameOrder.order = order;
    },

    measure(): HierarchicalDrawOrderMeasurement {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const unitsPerPixel = verticalWorldUnits / canvas.height;
      const sampleAtWorldX = (x: number): SampledSprite => {
        const { data } = context2d.getImageData(
          Math.round(canvas.width / 2 + x / unitsPerPixel),
          Math.round(canvas.height / 2),
          1,
          1,
        );

        return classify(data[0], data[1], data[2]);
      };

      return {
        shipAndFlame: sampleAtWorldX(-0.5),
        rockAndFlame: sampleAtWorldX(-1.5),
        flameOrder: flameOrder.order,
      };
    },
  };
};
