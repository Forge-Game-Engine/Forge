import fontImageUrl from '../../../assets/fonts/default/default.png?url';
import fontMetricsUrl from '../../../assets/fonts/default/default.json?url';
import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import {
  createComponentId,
  EcsSystem,
  EcsWorld,
} from '../../../src/ecs/index.js';
import {
  addSpriteComponent,
  Color,
  createCamera,
  createCameraEcsSystem,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  getCameraView,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '../../../src/rendering/index.js';
import {
  createTextShapingEcsSystem,
  FontAtlasCache,
  textId,
} from '../../../src/text/index.js';
import {
  addGridLayoutGroupComponent,
  createLabel,
  createPanel,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
} from '../../../src/ui/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const verticalWorldUnits = 600;
const batchSize = 50;
const timeBetweenBatches = 0.1;
const columnCount = 24;
const cellSize = { x: 60, y: 60 };
const cellSpacing = { x: 4, y: 4 };

// The docs-site demo spawns until the frame rate drops below 30 FPS. A test
// steps frames without a real clock, so it spawns a fixed number instead,
// all within the allocation specs' warm-up, after which the scene is in a
// steady state.
const maxPanels = 400;

/** Drives the panel spawner: where panels go, what they look like, and how often. */
interface StressTestSpawnerEcsComponent {
  /** The container entity new cells are parented to - carries the `GridLayoutGroupEcsComponent` they're arranged by. */
  container: number;
  /** The sprite each spawned cell is created with (cloned per cell by `createPanel`). */
  cellSprite: SpriteEcsComponent;
  batchSize: number;
  timeBetweenBatches: number;
  nextSpawnTime: number;
  spawnedCount: number;
  maxCount: number;
}

const stressTestSpawnerId =
  createComponentId<StressTestSpawnerEcsComponent>('stressTestSpawner');

/**
 * Spawns batches of small panels into the grid-arranged container at a
 * fixed interval, until the spawner has spawned its maximum. Each spawned
 * panel is an ordinary `RectTransformEcsComponent` + `SpriteEcsComponent`
 * entity that the layout systems measure and resolve fresh every frame.
 */
const createStressTestSpawnerEcsSystem = (
  time: Time,
): EcsSystem<[StressTestSpawnerEcsComponent]> => ({
  query: [stressTestSpawnerId],
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
        const panel = createPanel(world, spawner.container, {
          sprite: spawner.cellSprite,
        });

        // A cheap, deterministic tint so newer cells read visually distinct
        // from older ones without any per-cell randomness.
        const shade = 0.4 + (0.6 * (spawner.spawnedCount % 20)) / 20;

        world.getComponentRequired(panel, spriteId).tintColor = new Color(
          shade,
          shade * 0.7,
          1,
          1,
        );

        spawner.spawnedCount += 1;
      }
    }
  },
});

function createBackdrop(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
): void {
  const backdropSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.world,
  };

  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);

  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;

  backdropSprite.width = width;
  backdropSprite.height = height;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, backdropSprite);
}

/** The UI stress scene's handle. */
export interface UiStressSceneHandle extends SceneHandle {
  /** How many panels have been spawned so far. */
  readonly panelCount: number;
  /** How many panels the scene spawns in all. */
  readonly maxPanelCount: number;
}

/**
 * The docs site's UI stress test: a full-screen grid layout group that a
 * spawner fills with small panels, 50 every 0.1 seconds, up to
 * {@link maxPanels}, under a status label that shows the count. The layout
 * systems keep no dirty tracking, so they lay out every panel every frame.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<UiStressSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas);

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits,
  });

  createBackdrop(world, camera, renderContext);

  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
    metricsUrl: fontMetricsUrl,
    imageUrl: fontImageUrl,
  });

  registerUiSystems(world, renderContext, time);

  const uiCanvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const cellSprite = {
    ...createImageSprite(renderContext.whiteTexture, {
      pixelsPerUnit: 1,
    }),
    category: renderLayers.ui,
  };

  const containerSprite = {
    ...createImageSprite(renderContext.whiteTexture, {
      pixelsPerUnit: 1,
    }),
    category: renderLayers.ui,
  };

  containerSprite.tintColor = new Color(0.14, 0.16, 0.22, 1);

  // Created (and so drawn) before the status label below, so the label
  // stays on top of the whole grid - draw order follows hierarchy
  // pre-order, and every spawned cell is a descendant of this container.
  const gridContainer = createPanel(world, uiCanvas, {
    anchor: UiAnchor.stretchAll(),
    sprite: containerSprite,
  });

  addGridLayoutGroupComponent(world, gridContainer, {
    constraint: 'fixedColumnCount',
    constraintCount: columnCount,
    cellSize,
    spacing: cellSpacing,
  });

  const spawner: StressTestSpawnerEcsComponent = {
    container: gridContainer,
    cellSprite,
    batchSize,
    timeBetweenBatches,
    nextSpawnTime: 0,
    spawnedCount: 0,
    maxCount: maxPanels,
  };

  world.addComponent(world.createEntity(), stressTestSpawnerId, spawner);

  const statusLabel = createLabel(world, uiCanvas, {
    text: 'Spawned: 0',
    fontAtlas,
    size: 28,
    anchor: UiAnchor.stretchTop({ height: 48 }),
    color: Color.white,
    category: renderLayers.ui,
  });
  const statusText = world.getComponentRequired(statusLabel, textId);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));
  world.addSystem(createStressTestSpawnerEcsSystem(time));

  // Poll instead of an event, since nothing publishes a "layout just
  // changed" notification - cheap enough at once per frame.
  world.addSystem({
    name: 'stressTestStatusLabel',
    query: [],
    update: () => {
      statusText.text = `Spawned: ${spawner.spawnedCount}`;
    },
  });

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get panelCount(): number {
      return spawner.spawnedCount;
    },

    maxPanelCount: maxPanels,
  };
};
