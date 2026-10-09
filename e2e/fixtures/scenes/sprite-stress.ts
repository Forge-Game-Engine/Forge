import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import {
  createComponentId,
  EcsSystem,
  EcsWorld,
} from '../../../src/ecs/index.js';
import { Random, Vec2 } from '../../../src/math/index.js';
import {
  addSpriteComponent,
  createCamera,
  createCameraEcsSystem,
  createCanvas,
  createImageSprite,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  getCameraView,
  SpriteEcsComponent,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';
import { drawStar } from './stress-scene-textures.js';

const defaultStepDeltaMilliseconds = 16.6666;

const renderLayers = {
  foreground: 1 << 0,
};

const verticalWorldUnits = 600;
const batchSize = 100;
const timeBetweenBatches = 0.1;
const spriteScale = 0.25;

// The docs-site demo spawns until the frame rate drops below 30 FPS. A test
// steps frames without a real clock, so it spawns a fixed number instead,
// all within the allocation specs' warm-up, after which the scene is in a
// steady state.
const maxSprites = 1_000;

/** Drives the sprite batch spawner: what to spawn, where and how often. */
interface SpriteSpawnerEcsComponent {
  sprite: SpriteEcsComponent;
  spriteScale: number;
  batchSize: number;
  timeBetweenBatches: number;
  nextSpawnTime: number;
  spawnedCount: number;
  maxCount: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const spriteSpawnerId =
  createComponentId<SpriteSpawnerEcsComponent>('spriteSpawner');

/**
 * Spawns batches of sprites at random positions at a fixed interval, until
 * the spawner has spawned its maximum.
 */
const createSpriteSpawnerEcsSystem = (
  time: Time,
  random: Random,
): EcsSystem<[SpriteSpawnerEcsComponent]> => ({
  query: [spriteSpawnerId],
  update: (world, { components: [spawners] }) => {
    for (const spawner of spawners) {
      if (
        spawner.spawnedCount >= spawner.maxCount ||
        time.timeInSeconds < spawner.nextSpawnTime
      ) {
        continue;
      }

      spawner.nextSpawnTime = time.timeInSeconds + spawner.timeBetweenBatches;

      for (let i = 0; i < spawner.batchSize; i++) {
        const position = {
          x: random.randomFloat(spawner.minX, spawner.maxX),
          y: random.randomFloat(spawner.minY, spawner.maxY),
        };

        const entity = world.createEntity();

        addPositionComponent(world, entity, {
          local: Vec2.clone(position),
        });

        addRotationComponent(world, entity);

        addScaleComponent(world, entity, {
          local: { x: spawner.spriteScale, y: spawner.spriteScale },
        });

        addSpriteComponent(world, entity, spawner.sprite);

        spawner.spawnedCount += 1;
      }
    }
  },
});

/** The sprite stress scene's handle. */
export interface SpriteStressSceneHandle extends SceneHandle {
  /** How many sprites have been spawned so far. */
  readonly spriteCount: number;
  /** How many sprites the scene spawns in all. */
  readonly maxSpriteCount: number;
}

/**
 * The docs site's sprite stress test: batches of 100 star sprites spawned
 * at random positions every 0.1 seconds, up to {@link maxSprites}.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SpriteStressSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas);

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits,
  });

  const sprite = {
    ...createImageSprite(createTexture(renderContext, drawStar(32)), {
      pixelsPerUnit: 1,
    }),
    category: renderLayers.foreground,
  };

  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;

  const spawner: SpriteSpawnerEcsComponent = {
    sprite,
    spriteScale,
    batchSize,
    timeBetweenBatches,
    nextSpawnTime: 0,
    spawnedCount: 0,
    maxCount: maxSprites,
    minX: -width / 2,
    maxX: width / 2,
    minY: -height / 2,
    maxY: height / 2,
  };

  world.addComponent(world.createEntity(), spriteSpawnerId, spawner);

  const random = new Random();

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createSpriteSpawnerEcsSystem(time, random));
  // After the spawner, so each sprite it spawns (with only a `local` pose)
  // gets its `world` pose before the render system first draws it.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get spriteCount(): number {
      return spawner.spawnedCount;
    },

    maxSpriteCount: maxSprites,
  };
};
