import {
  addPositionComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  positionId,
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
export type SampledSprite =
  'character' | 'upperWall' | 'lowerWall' | 'background';

/** What `y-sort-units.spec.ts` asserts against, from one frame. */
export interface YSortUnitsMeasurement {
  /** The character's `position.world.y`, read back from the ECS. */
  characterY: number;

  /** What's drawn at the centre of the upper wall, where the character overlaps it. */
  atUpperWall: SampledSprite;

  /** What's drawn at the centre of the lower wall, where the character overlaps it. */
  atLowerWall: SampledSprite;
}

/** The handle `y-sort-units.spec.ts` drives and asserts against. */
export interface YSortUnitsSceneHandle extends SceneHandle {
  /** Moves the character root to `y`. */
  setCharacterY(y: number): void;

  /** Sets the lower wall's `DrawOrderEcsComponent.ySortOrigin`. */
  setLowerWallSortOrigin(ySortOrigin: number): void;

  /**
   * Samples the overlaps from the canvas's displayed bitmap. Must be called
   * in the same `page.evaluate` task as the preceding `step()`.
   */
  measure(): YSortUnitsMeasurement;
}

const upperWallPosition = { x: -2, y: -1 };
const lowerWallPosition = { x: 2, y: 1 };

const classify = (r: number, g: number, b: number): SampledSprite => {
  if (r > 200 && g > 200 && b > 200) {
    return 'background';
  }

  if (r >= g && r >= b) {
    return 'character';
  }

  return b >= g ? 'upperWall' : 'lowerWall';
};

/**
 * Builds a minimal scene for y-sort units: a camera that y-sorts, a level
 * root with `ySortChildren` holding a blue upper wall and a green lower
 * wall, and a tall red character that is a root of its own, overlapping
 * both walls whatever its Y. Each wall is a sort unit, so the character
 * draws in front of a wall when its Y is greater than the wall's and behind
 * it when it's smaller. Without `ySortChildren` both walls would sort at the
 * level's Y.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<YSortUnitsSceneHandle> => {
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
    ySort: true,
  });

  const addRectangle = (
    position: { x: number; y: number },
    width: number,
    height: number,
    color: Color,
  ): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { ...position } });
    addSpriteComponent(world, entity, {
      ...createImageSprite(renderContext.whiteTexture),
      width,
      height,
      tintColor: color,
    });

    return entity;
  };

  const level = world.createEntity();

  addPositionComponent(world, level);
  addDrawOrderComponent(world, level, { ySortChildren: true });

  const upperWall = addRectangle(
    upperWallPosition,
    2,
    2,
    new Color(0, 0, 1, 1),
  );
  const lowerWall = addRectangle(
    lowerWallPosition,
    2,
    2,
    new Color(0, 1, 0, 1),
  );

  world.setParent(upperWall, level);
  world.setParent(lowerWall, level);

  const lowerWallDrawOrder: DrawOrderEcsComponent = addDrawOrderComponent(
    world,
    lowerWall,
  );

  // Wide and tall enough to overlap both walls' centres at every Y the spec
  // moves it to.
  const character = addRectangle({ x: 0, y: 0 }, 6, 8, new Color(1, 0, 0, 1));
  const characterPosition = world.getComponentRequired<PositionEcsComponent>(
    character,
    positionId,
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

    setCharacterY(y: number): void {
      characterPosition.local.y = y;
    },

    setLowerWallSortOrigin(ySortOrigin: number): void {
      lowerWallDrawOrder.ySortOrigin = ySortOrigin;
    },

    measure(): YSortUnitsMeasurement {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const unitsPerPixel = verticalWorldUnits / canvas.height;
      const sampleAt = (position: { x: number; y: number }): SampledSprite => {
        const { data } = context2d.getImageData(
          Math.round(canvas.width / 2 + position.x / unitsPerPixel),
          Math.round(canvas.height / 2 + position.y / unitsPerPixel),
          1,
          1,
        );

        return classify(data[0], data[1], data[2]);
      };

      return {
        characterY: characterPosition.world.y,
        atUpperWall: sampleAt(upperWallPosition),
        atLowerWall: sampleAt(lowerWallPosition),
      };
    },
  };
};
