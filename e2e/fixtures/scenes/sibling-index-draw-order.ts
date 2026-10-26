import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addCameraComponent,
  addSpriteComponent,
  Color,
  createCanvas,
  createImageSprite,
  createRenderContext,
  createRenderEcsSystem,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;
const verticalWorldUnits = 10;

/** Which of the scene's sprites a sampled pixel shows, by its dominant channel. */
export type SampledSprite = 'left' | 'right' | 'inserted' | 'background';

/** What `sibling-index-draw-order.spec.ts` asserts against, from one frame. */
export interface SiblingIndexDrawOrderMeasurement {
  /** Where the left sibling and the inserted child overlap. */
  leftAndInserted: SampledSprite;

  /** Where the right sibling and the inserted child overlap. */
  rightAndInserted: SampledSprite;

  /** The inserted child's sibling index, read back from the world. */
  insertedSiblingIndex: number;
}

/** The handle `sibling-index-draw-order.spec.ts` drives and asserts against. */
export interface SiblingIndexDrawOrderSceneHandle extends SceneHandle {
  /** Moves the inserted child with `EcsWorld.setSiblingIndex`. */
  setInsertedSiblingIndex(index: number): void;

  /**
   * Samples the overlaps from the canvas's displayed bitmap. Must be called
   * in the same `page.evaluate` task as the preceding `step()`.
   */
  measure(): SiblingIndexDrawOrderMeasurement;
}

const classify = (r: number, g: number, b: number): SampledSprite => {
  if (r > 200 && g > 200 && b > 200) {
    return 'background';
  }

  if (r >= g && r >= b) {
    return 'left';
  }

  return g >= b ? 'inserted' : 'right';
};

/**
 * Builds a minimal scene for sibling order: a parent with no sprite of its
 * own and two children, a red one on the left and a blue one on the right,
 * then a green child parented last, centered over both so it overlaps each
 * of them. Appended by `setParent`, it draws in front of both; moved to
 * sibling index `1` it draws between them, and to `0` behind both.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<SiblingIndexDrawOrderSceneHandle> => {
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

  const parent = world.createEntity();

  addPositionComponent(world, parent);

  const addSquare = (x: number, color: Color): number => {
    const entity = world.createEntity();
    addPositionComponent(world, entity, { local: { x, y: 0 } });
    addSpriteComponent(world, entity, {
      ...createImageSprite(renderContext.whiteTexture),
      width: 2,
      height: 2,
      tintColor: color,
    });
    world.setParent(entity, parent);

    return entity;
  };

  // Each square is 2 world units wide: the left one spans x in [-2.5, -0.5],
  // the right one [0.5, 2.5], and the inserted one [-1, 1], so it overlaps
  // the left one in [-1, -0.5] and the right one in [0.5, 1].
  addSquare(-1.5, new Color(1, 0, 0, 1));
  addSquare(1.5, new Color(0, 0, 1, 1));
  const inserted = addSquare(0, new Color(0, 1, 0, 1));

  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    setInsertedSiblingIndex(index: number): void {
      world.setSiblingIndex(inserted, index);
    },

    measure(): SiblingIndexDrawOrderMeasurement {
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
        leftAndInserted: sampleAtWorldX(-0.75),
        rightAndInserted: sampleAtWorldX(0.75),
        insertedSiblingIndex: world.getSiblingIndex(inserted),
      };
    },
  };
};
