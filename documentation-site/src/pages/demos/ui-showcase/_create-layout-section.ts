import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';
import { anchorPresets, createUiPanel, createUiText } from '@forge-game-engine/forge/ui';
import type { SectionContext, SectionResult } from './_section-context';

const HEIGHT = 190;
const MARGIN = 16;

export function createLayoutSection(ctx: SectionContext): SectionResult {
  const { world, renderContext, contentEntity, contentWidth, y, font, panelRenderable } = ctx;

  const section = createUiPanel(world, {
    renderable: panelRenderable,
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 0),
    offsetMin: new Vector2(MARGIN, y),
    offsetMax: new Vector2(-MARGIN, y + HEIGHT),
    parent: contentEntity,
    tintColor: Color.transparent,
    borderColor: Color.transparent,
  });

  createUiText(world, renderContext, {
    text: '1. Layout and Anchors',
    font,
    fontSize: 18,
    color: Color.white,
    rect: { x: 0, y: 0, width: contentWidth - MARGIN * 2, height: 24 },
    parent: section.entity,
  });

  const stageWidth = Math.min(360, contentWidth - MARGIN * 2);
  const stageHeight = 130;

  const stage = createUiPanel(world, {
    renderable: panelRenderable,
    rect: { x: 0, y: 32, width: stageWidth, height: stageHeight },
    parent: section.entity,
    tintColor: new Color(0.1, 0.11, 0.14, 1),
    borderColor: new Color(0.4, 0.43, 0.5, 1),
    borderWidth: 1,
    cornerRadius: 6,
  });

  const swatchSize = 22;
  const swatchColor = new Color(0.35, 0.65, 0.95, 1);

  // Point anchors: one swatch per corner, positioned relative to that
  // corner's anchor point using `rect` (point-anchor mode).
  const corners = [
    { preset: anchorPresets.topLeft, rect: { x: 6, y: 6, width: swatchSize, height: swatchSize } },
    {
      preset: anchorPresets.topRight,
      rect: { x: -6 - swatchSize, y: 6, width: swatchSize, height: swatchSize },
    },
    { preset: anchorPresets.center, rect: { x: -swatchSize / 2, y: -swatchSize / 2, width: swatchSize, height: swatchSize } },
    {
      preset: anchorPresets.bottomLeft,
      rect: { x: 6, y: -6 - swatchSize, width: swatchSize, height: swatchSize },
    },
    {
      preset: anchorPresets.bottomRight,
      rect: { x: -6 - swatchSize, y: -6 - swatchSize, width: swatchSize, height: swatchSize },
    },
  ];

  for (const { preset, rect } of corners) {
    createUiPanel(world, {
      renderable: panelRenderable,
      anchorMin: preset.anchorMin,
      anchorMax: preset.anchorMax,
      pivot: preset.pivot,
      rect,
      parent: stage.entity,
      tintColor: swatchColor,
      cornerRadius: 4,
    });
  }

  // Stretch anchor: a thin bar pinned to the bottom edge that grows and
  // shrinks with the stage's own width.
  createUiPanel(world, {
    renderable: panelRenderable,
    anchorMin: new Vector2(0, 1),
    anchorMax: new Vector2(1, 1),
    offsetMin: new Vector2(8, -16),
    offsetMax: new Vector2(-8, -8),
    parent: stage.entity,
    tintColor: new Color(0.95, 0.55, 0.25, 1),
    cornerRadius: 3,
  });

  createUiText(world, renderContext, {
    text: 'Point anchors at each corner and center; a stretch anchor along the bottom edge.',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    wrap: 'word',
    rect: {
      x: stageWidth + 16,
      y: 32,
      width: Math.max(120, contentWidth - MARGIN * 2 - stageWidth - 16),
      height: stageHeight,
    },
    parent: section.entity,
  });

  return { height: HEIGHT, themedRenderables: [] };
}
