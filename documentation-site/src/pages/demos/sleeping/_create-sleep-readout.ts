import { Time } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  Color,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  FontAtlasCache,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createLabel,
  createPanel,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { sleepReadoutId } from './_sleep-readout.component';

const lineCount = 3;
const lineHeight = 40;
const padding = 20;
const panelWidth = 520;

/**
 * Creates the on-screen readout panel and an entity holding its
 * `SleepReadoutEcsComponent`.
 * @param world - The ECS world to add the readout to.
 * @param renderContext - The render context used to load the font.
 * @param time - The time instance the UI systems read.
 * @param renderLayer - The render layer the readout is drawn on.
 */
export async function createSleepReadout(
  world: EcsWorld,
  renderContext: RenderContext,
  time: Time,
  renderLayer: number,
): Promise<void> {
  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
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
    cullingMask: renderLayer,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const panelSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayer,
  };
  panelSprite.tintColor = new Color(0.05, 0.06, 0.09, 0.75);

  const panel = createPanel(world, canvas, {
    sprite: panelSprite,
    anchor: UiAnchor.topLeft({
      x: panelWidth,
      y: lineCount * lineHeight + padding * 2,
    }),
    anchoredPosition: { x: 100, y: 40 },
  });

  const labels: number[] = [];

  for (let i = 0; i < lineCount; i++) {
    labels.push(
      createLabel(world, panel, {
        text: '',
        fontAtlas,
        size: 28,
        anchor: UiAnchor.topLeft({
          x: panelWidth - padding * 2,
          y: lineHeight,
        }),
        anchoredPosition: { x: padding, y: padding + i * lineHeight },
        verticalAlign: textVerticalAlignments.middle,
        color: Color.white,
        category: renderLayer,
      }),
    );
  }

  world.addComponent(world.createEntity(), sleepReadoutId, { labels });
}
