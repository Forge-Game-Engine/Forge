import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteComponent,
  calculateVisibleWorldSize,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textId,
} from '@forge-game-engine/forge/text';
import {
  addGridLayoutGroupComponent,
  createLabel,
  createPanel,
  createUiCanvas,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createFpsMonitorEcsSystem } from './_fps-monitor.system';
import {
  StressTestSpawnerEcsComponent,
  stressTestSpawnerId,
} from './_stress-test-spawner.component';
import { createStressTestSpawnerEcsSystem } from './_stress-test-spawner.system';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const batchSize = 50;
const timeBetweenBatches = 0.1;
const columnCount = 24;
const cellSize = { x: 60, y: 60 };
const cellSpacing = { x: 4, y: 4 };

async function createBackdrop(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const backdropSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.world,
  });
  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );

  backdropSprite.width = width;
  backdropSprite.height = height;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, backdropSprite);
}

/**
 * Builds the UI stress test: a full-screen grid layout group that a
 * spawner fills with small panels at a fixed interval, growing the on-
 * screen UI element count over time. Open the browser console to see how
 * many panels had been spawned when the frame rate first dropped below
 * 100, 60, and 30 FPS - this is `createUiLayoutEcsSystem`/
 * `createUiLayoutGroupEcsSystem`'s own full-recompute-every-frame design
 * (DL-12 in `design/ui-system.md`) under load, with no dirty tracking.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load, for the status label.
 * @returns The created game.
 */
export const createUiStressTestGame = async (
  fontAtlasUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const canvas = createUiCanvas(world, renderContext, time, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const cellImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const cellSprite = createImageSprite(cellImage, renderContext, {
    layer: renderLayers.ui,
  });

  const containerSprite = createImageSprite(cellImage, renderContext, {
    layer: renderLayers.ui,
  });
  containerSprite.tintColor = new Color(0.14, 0.16, 0.22, 1);

  // Created (and so drawn) before the status label below, so the label
  // stays on top of the whole grid - draw order follows hierarchy
  // pre-order, and every spawned cell is a descendant of this container.
  const container = createPanel(world, canvas, {
    anchor: UiAnchor.stretchAll(),
    sprite: containerSprite,
  });

  addGridLayoutGroupComponent(world, container, {
    constraint: 'fixedColumnCount',
    constraintCount: columnCount,
    cellSize,
    spacing: cellSpacing,
  });

  const spawnerEntity = world.createEntity();

  const spawnerComponent: StressTestSpawnerEcsComponent = {
    container,
    cellSprite,
    batchSize,
    timeBetweenBatches,
    nextSpawnTime: 0,
    spawnedCount: 0,
    isSpawning: true,
  };

  world.addComponent(spawnerEntity, stressTestSpawnerId, spawnerComponent);

  const statusLabel = createLabel(world, canvas, {
    text: 'Spawned: 0',
    fontAtlas,
    size: 28,
    anchor: UiAnchor.stretchTop({ height: 48 }),
    color: Color.white,
    category: renderLayers.ui,
  });
  const statusText = world.getComponent(statusLabel, textId)!;

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));
  world.addSystem(createStressTestSpawnerEcsSystem(time));
  world.addSystem(createFpsMonitorEcsSystem(time));

  // Poll instead of an event, since nothing currently publishes a "layout
  // just changed" notification - cheap enough at once per frame.
  world.addSystem({
    name: 'stressTestStatusLabel',
    query: [],
    update: () => {
      statusText.text = `Spawned: ${spawnerComponent.spawnedCount}`;
    },
  });

  return game;
};
