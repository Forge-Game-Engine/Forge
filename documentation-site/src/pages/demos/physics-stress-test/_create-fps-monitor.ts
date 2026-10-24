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
import { FpsMonitorEcsComponent, fpsMonitorId } from './_fps-monitor.component';

/**
 * The FPS thresholds to watch for, from the least to the most severe.
 */
const fpsThresholds = [100, 60, 30];

const lineHeight = 40;
const padding = 20;
const panelWidth = 460;

/**
 * Creates the on-screen readout and attaches the FPS monitor to the
 * spawner entity, whose body count it reports.
 * @param world - The ECS world to add the readout to.
 * @param renderContext - The render context used to load the font.
 * @param time - The time instance the UI systems read.
 * @param spawnerEntity - The entity holding the body spawner.
 * @param renderLayer - The render layer the readout should be drawn on.
 */
export async function createFpsMonitor(
  world: EcsWorld,
  renderContext: RenderContext,
  time: Time,
  spawnerEntity: number,
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

  const lineCount = fpsThresholds.length + 2;

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
        text: i === 0 ? 'Display: measuring...' : '',
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

  const monitor: FpsMonitorEcsComponent = {
    readings: fpsThresholds.map((threshold) => ({
      threshold,
      state: 'watching',
      bodyCount: 0,
    })),
    startTimeInMilliseconds: null,
    displayFps: null,
    labels,
  };

  world.addComponent(spawnerEntity, fpsMonitorId, monitor);
}
