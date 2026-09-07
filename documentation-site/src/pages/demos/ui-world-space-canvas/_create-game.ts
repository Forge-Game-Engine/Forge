import {
  addParentComponent,
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  RotationEcsComponent,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
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
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addUiWorldSpaceFollowComponent,
  createLabel,
  createPanel,
  createUiCanvas,
  createUiWorldSpaceFollowEcsSystem,
  UiAnchor,
  uiCanvasRenderModes,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

// A world-space canvas draws through the same camera as everything else -
// there's no dedicated UI camera/cullingMask to isolate it with, unlike
// the default `renderMode: 'screenSpace'`.
const renderLayers = {
  world: 1 << 0,
};

const spinRadiansPerSecond = 1.4;

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
  // Unlike every other demo's backdrop, this scene draws bare world
  // sprites (the enemies) in the same layer/camera pass instead of routing
  // everything else through a separate screen-space UI camera - sprites
  // sort by position.world.y by default, and the enemies' y (-40) sorts
  // below this sprite's own default (0), which would otherwise draw the
  // backdrop over them since it covers the whole visible world. Pin it to
  // the very back explicitly instead.
  backdropSprite.sortDepth = -10000;

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
 * Creates a spinning "enemy" (a square sprite plus a triangle-ish facing
 * marker, so the rotation is visually obvious) at `x`, and a world-space
 * health-bar canvas attached to it.
 * @param attachment - `'parent'` attaches the canvas the ordinary way
 * (`addParentComponent`), which inherits the enemy's full world transform
 * - the canvas visibly spins and swings around as the enemy rotates.
 * `'follow'` attaches it with `addUiWorldSpaceFollowComponent` instead,
 * which tracks only the enemy's world position - the canvas stays upright
 * and directly above the enemy no matter which way it's facing.
 */
async function createSpinningEnemyWithHealthBar(
  world: EcsWorld,
  renderContext: RenderContext,
  time: Time,
  fontAtlas: FontAtlas,
  worldCamera: number,
  x: number,
  attachment: 'parent' | 'follow',
): Promise<void> {
  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );

  const enemySprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.world,
  });

  enemySprite.tintColor = new Color(0.3, 0.5, 0.9, 1);
  enemySprite.width = 100;
  enemySprite.height = 100;

  const enemy = world.createEntity();

  addPositionComponent(world, enemy, { local: { x, y: -40 } });
  addRotationComponent(world, enemy);
  addSpriteComponent(world, enemy, enemySprite);

  // A small facing marker offset from center, so the enemy's own rotation
  // is visible even though the square body itself looks the same at any
  // angle.
  const markerSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.world,
  });

  markerSprite.tintColor = new Color(1, 0.85, 0.2, 1);
  markerSprite.width = 16;
  markerSprite.height = 16;

  const marker = world.createEntity();

  addPositionComponent(world, marker, { local: { x: 36, y: 0 } });
  addParentComponent(world, marker, { parent: enemy });
  addSpriteComponent(world, marker, markerSprite);

  const healthBarCanvas = createUiCanvas(world, renderContext, time, {
    renderMode: uiCanvasRenderModes.worldSpace,
    camera: worldCamera,
    anchor: UiAnchor.center({ x: 110, y: 16 }),
    anchoredPosition: { x: 0, y: 80 },
  });

  if (attachment === 'parent') {
    addParentComponent(world, healthBarCanvas, { parent: enemy });
  } else {
    addUiWorldSpaceFollowComponent(world, healthBarCanvas, { target: enemy });
  }

  const barBackgroundSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.world,
  });
  barBackgroundSprite.tintColor = new Color(0.15, 0.15, 0.18, 1);

  createPanel(world, healthBarCanvas, {
    sprite: barBackgroundSprite,
    anchor: UiAnchor.stretchAll(),
  });

  const barFillSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.world,
  });
  barFillSprite.tintColor = new Color(0.25, 0.85, 0.35, 1);

  createPanel(world, healthBarCanvas, {
    sprite: barFillSprite,
    // A negative margin insets the fill from the background panel's edges
    // by 3 units on every side, giving the bar a thin visible border.
    anchor: UiAnchor.stretchAll({ x: -3, y: -3 }),
  });

  createLabel(world, healthBarCanvas, {
    text:
      attachment === 'parent'
        ? 'addParentComponent'
        : 'addUiWorldSpaceFollowComponent',
    fontAtlas,
    size: 20,
    anchor: UiAnchor.center({ x: 260, y: 32 }),
    anchoredPosition: { x: 0, y: -34 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.world,
  });
}

/** Spins every entity with a RotationEcsComponent at a constant rate - the demo's only source of motion. */
function createSpinEcsSystem(time: Time): EcsSystem<[RotationEcsComponent]> {
  return {
    name: 'spin',
    query: [rotationId],
    update: (_world, { components: [rotations] }) => {
      for (const rotation of rotations) {
        rotation.local += spinRadiansPerSecond * time.deltaTimeInSeconds;
      }
    },
  };
}

/**
 * Builds the world-space canvas demo: two identical spinning "enemies",
 * each with a diegetic health-bar canvas (`renderMode: 'worldSpace'`)
 * attached to it. The left enemy's health bar is attached with the
 * ordinary `addParentComponent` and visibly spins and swings around with
 * the enemy. The right enemy's is attached with
 * `addUiWorldSpaceFollowComponent` instead, and stays upright, directly
 * above, regardless of which way the enemy is facing.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createWorldSpaceCanvasGame = async (
  fontAtlasUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const worldCamera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  await createSpinningEnemyWithHealthBar(
    world,
    renderContext,
    time,
    fontAtlas,
    worldCamera,
    -180,
    'parent',
  );

  await createSpinningEnemyWithHealthBar(
    world,
    renderContext,
    time,
    fontAtlas,
    worldCamera,
    180,
    'follow',
  );

  world.addSystem(createSpinEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  // After createTransformEcsSystem, not before like the rest of the UI
  // pipeline - see createUiWorldSpaceFollowEcsSystem's own doc comment.
  world.addSystem(createUiWorldSpaceFollowEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
