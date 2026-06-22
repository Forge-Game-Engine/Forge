import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';
import { createUiPanel, createUiText } from '@forge-game-engine/forge/ui';
import type { SectionContext, SectionResult } from './_section-context';

const HEIGHT = 150;
const MARGIN = 16;

export function createTextSection(ctx: SectionContext): SectionResult {
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
    text: '3. Text Rendering',
    font,
    fontSize: 18,
    color: Color.white,
    rect: { x: 0, y: 0, width: contentWidth - MARGIN * 2, height: 24 },
    parent: section.entity,
  });

  const columnWidth = Math.min(150, (contentWidth - MARGIN * 2 - 32) / 3);

  const alignments: { label: string; align: 'left' | 'center' | 'right' }[] = [
    { label: 'left', align: 'left' },
    { label: 'center', align: 'center' },
    { label: 'right', align: 'right' },
  ];

  alignments.forEach(({ label, align }, i) => {
    createUiPanel(world, {
      renderable: panelRenderable,
      rect: { x: i * (columnWidth + 16), y: 36, width: columnWidth, height: 70 },
      parent: section.entity,
      tintColor: new Color(0.14, 0.15, 0.18, 1),
      borderColor: new Color(0.35, 0.38, 0.45, 1),
      borderWidth: 1,
      cornerRadius: 6,
    });

    createUiText(world, renderContext, {
      text: `align: ${label}`,
      font,
      fontSize: 14,
      color: new Color(0.85, 0.87, 0.92, 1),
      align,
      verticalAlign: 'middle',
      rect: {
        x: i * (columnWidth + 16) + 6,
        y: 36 + 6,
        width: columnWidth - 12,
        height: 58,
      },
      parent: section.entity,
    });
  });

  const wrapX = 3 * (columnWidth + 16);
  const wrapWidth = Math.max(120, contentWidth - MARGIN * 2 - wrapX);

  createUiText(world, renderContext, {
    text: 'Word-wrapped text flows across multiple lines to fit the available width.',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    wrap: 'word',
    rect: { x: wrapX, y: 36, width: wrapWidth, height: 70 },
    parent: section.entity,
  });

  return { height: HEIGHT, themedRenderables: [] };
}
