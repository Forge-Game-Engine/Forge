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
 * Builds the progress bar demo: a single `createProgressBar` health bar,
 * driven purely by a `value` write from `_pulse.system.ts` (not by any
 * player input, since a progress bar reports state rather than accepting
 * it) - `createUiProgressBarEcsSystem` picks up the write the same frame
 * it's made, unlike a slider, which has no such guarantee.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createProgressBarGame = async (
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

  registerUiSystems(world, renderContext, time);

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const healthFillImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/Burn_Gradient.png'),
  );

  const trackSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
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
    fillSprite: createImageSprite(healthFillImage, renderContext, {
      layer: renderLayers.ui,
    }),
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

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createPulseEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
