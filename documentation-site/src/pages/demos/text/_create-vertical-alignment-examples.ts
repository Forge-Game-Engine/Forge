import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  Color,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  shapeText,
} from '@forge-game-engine/forge/text';

const sampleText = 'Anchored to the line below.';
const bodySize = 15;
const bodyLineHeight = 1.15;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.85, 0.87, 0.92, 1);
const anchorLineColor = new Color(0.95, 0.55, 0.25, 1);
const anchorLineThickness = 2;
const captionGap = 20;
const columnGap = 18;

const columns: {
  label: string;
  verticalAlign: 'top' | 'middle' | 'bottom' | 'baseline' | 'capline';
}[] = [
  { label: 'top (default)', verticalAlign: 'top' },
  { label: 'middle', verticalAlign: 'middle' },
  { label: 'bottom', verticalAlign: 'bottom' },
  { label: 'baseline', verticalAlign: 'baseline' },
  { label: 'capline', verticalAlign: 'capline' },
];

/**
 * Builds a 5-column showcase of every `verticalAlign` value (`top`/
 * `middle`/`bottom`/`baseline`/`capline`): each column draws the same short
 * block of text against a shared, highlighted anchor line at the same
 * entity position, so the difference between them is exactly what moves
 * relative to that line - `top` hangs below it, `bottom` sits above it,
 * `middle` straddles it on this exact text's own rendered ink, `baseline`
 * puts the first line's baseline directly on it, and `capline` hangs below
 * it like `top` but from the shorter cap height instead of the ascender.
 * @param world - The ECS world to add label entities to.
 * @param fontAtlas - The font atlas every label draws from.
 * @param whiteSprite - A plain white sprite template for the anchor lines.
 * @param guideLayer - The draw-order layer for the anchor lines (drawn behind text).
 * @param contentLayer - The draw-order layer for captions/body text.
 * @param topLeft - This section's top-left corner, in world units.
 * @param usableWidth - The total width available to lay the 5 columns out in.
 * @returns The y coordinate immediately below the section's content, for
 * stacking the next section beneath it.
 */
export function createVerticalAlignmentExamples(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  whiteSprite: SpriteEcsComponent,
  guideLayer: number,
  contentLayer: number,
  topLeft: Vector2,
  usableWidth: number,
): number {
  const columnWidth =
    (usableWidth - columnGap * (columns.length - 1)) / columns.length;

  const { bounds } = shapeText(sampleText, fontAtlas.data, {
    size: bodySize,
    lineHeight: bodyLineHeight,
    horizontalAlign: 'center',
    maxWidth: columnWidth,
  });

  // A `bottom`-aligned column needs `bounds.height` of headroom above the
  // anchor line, and a `top`-aligned one needs the same below it, so the
  // anchor line sits exactly one block-height beneath the captions.
  const anchorY = topLeft.y - captionGap - bounds.height;

  columns.forEach((column, index) => {
    const columnLeft = topLeft.x + index * (columnWidth + columnGap);
    const columnCenter = columnLeft + columnWidth / 2;

    const captionEntity = world.createEntity();
    addPositionComponent(world, captionEntity, {
      world: { x: columnLeft, y: topLeft.y },
    });
    addTextComponent(world, captionEntity, {
      text: column.label,
      fontAtlas,
      size: captionSize,
      color: captionColor,
      layer: contentLayer,
    });

    const lineEntity = world.createEntity();
    addPositionComponent(world, lineEntity, {
      world: { x: columnCenter, y: anchorY },
    });
    addSpriteComponent(world, lineEntity, {
      ...whiteSprite,
      width: columnWidth,
      height: anchorLineThickness,
      tintColor: anchorLineColor,
      layer: guideLayer,
    });

    const textEntity = world.createEntity();
    addPositionComponent(world, textEntity, {
      world: { x: columnLeft, y: anchorY },
    });
    addTextComponent(world, textEntity, {
      text: sampleText,
      fontAtlas,
      size: bodySize,
      lineHeight: bodyLineHeight,
      horizontalAlign: 'center',
      verticalAlign: column.verticalAlign,
      maxWidth: columnWidth,
      color: bodyColor,
      layer: contentLayer,
    });
  });

  return anchorY - bounds.height;
}
