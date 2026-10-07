import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  addSpriteComponent,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createTexture,
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createLabel,
  createProgressBar,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { pulseId } from './_pulse.component';
import { createPulseEcsSystem } from './_pulse.system';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

async function createBackdrop(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
): Promise<void> {
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

/**
 * Draws a white ring on a transparent canvas, for the cooldown's track and
 * fill.
 * @returns The canvas to upload as a texture.
 */
function drawRing(): HTMLCanvasElement {
  const size = 256;
  const source = document.createElement('canvas');

  source.width = size;
  source.height = size;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  context.strokeStyle = '#ffffff';
  context.lineWidth = size * 0.14;
  context.beginPath();
  context.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
  context.stroke();

  return source;
}

/**
 * Builds the progress bar demo: a linear health bar and a radial cooldown
 * ring from `createProgressBar`, driven purely by `value` writes from
 * `_pulse.system.ts` (not by any player input, since a progress bar reports
 * state rather than accepting it) - `createUiProgressBarEcsSystem` picks up
 * a write the same frame it's made, unlike a slider, which has no such
 * guarantee. Each fill keeps its full size; a mask reveals the part the
 * value covers.
 * @returns The created game.
 */
export const createProgressBarGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, camera, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad({
    // Importing the JSON would give its parsed contents, so `new URL` asks
    // webpack for its URL instead.
    metricsUrl: new URL(
      '@forge-game-engine/forge/fonts/default/default.json',
      import.meta.url,
    ).href,
    imageUrl: defaultFontImageUrl,
  });

  registerUiSystems(world, renderContext, time);

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const healthFillTexture = await renderContext.textureCache.getOrLoad(
    getAssetUrl('img/Burn_Gradient.png'),
  );

  const trackSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.ui,
  };
  trackSprite.tintColor = new Color(0.85, 0.85, 0.88, 1);

  createLabel(world, canvas, {
    text: 'Health',
    fontAtlas,
    size: 28,
    anchor: UiAnchor.center(),
    anchoredPosition: { x: -230, y: 60 },
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.ui,
  });

  const health = createProgressBar(world, canvas, {
    trackSprite,
    fillSprite: {
      ...createImageSprite(healthFillTexture, {
        pixelsPerUnit: 1,
      }),
      category: renderLayers.ui,
    },
    anchor: UiAnchor.center({ x: 460, y: 28 }),
    anchoredPosition: { x: 0, y: 0 },
    minValue: 0,
    maxValue: 100,
    value: 100,
  });

  world.addComponent(health.entity, pulseId, {
    minValue: 0,
    maxValue: 100,
    speed: 0.15,
  });

  const ringTexture = createTexture(renderContext, drawRing());
  const ringSprite = {
    ...createImageSprite(ringTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.ui,
  };

  createLabel(world, canvas, {
    text: 'Cooldown',
    fontAtlas,
    size: 28,
    anchor: UiAnchor.center(),
    anchoredPosition: { x: -205, y: -150 },
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.ui,
  });

  // A radial fill: the ring fills clockwise from its top as the value rises.
  const cooldown = createProgressBar(world, canvas, {
    trackSprite: { ...ringSprite, tintColor: new Color(1, 1, 1, 0.15) },
    fillSprite: { ...ringSprite, tintColor: new Color(0.35, 0.8, 1, 1) },
    fillShape: { kind: 'radial', startAngle: Math.PI / 2, sweep: -2 * Math.PI },
    anchor: UiAnchor.center({ x: 160, y: 160 }),
    anchoredPosition: { x: 0, y: -150 },
    minValue: 0,
    maxValue: 1,
    value: 0,
  });

  world.addComponent(cooldown.entity, pulseId, {
    minValue: 0,
    maxValue: 1,
    speed: 0.25,
  });

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createPulseEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
