import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  Color,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  shapeText,
} from '@forge-game-engine/forge/text';
import { createGuideBox } from './_create-guide-box';

const sampleText = 'The quick brown fox jumps over the lazy dog.';
const bodySize = 15;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.85, 0.87, 0.92, 1);
const captionGap = 20;
const columnGap = 18;

const columns: { label: string; lineHeight: number }[] = [
  { label: 'lineHeight: 0.8', lineHeight: 0.8 },
  { label: 'lineHeight: 1 (default)', lineHeight: 1 },
  { label: 'lineHeight: 1.8', lineHeight: 1.8 },
];

/**
 * Builds a 3-column showcase of the `lineHeight` multiplier: the same
 * wrapped paragraph is laid out at a few different multipliers side by
 * side, each with a guide box sized to that column's own computed
 * `bounds.height` - so the boxes themselves visibly grow with `lineHeight`,
 * not just the gaps between lines.
 * @param world - The ECS world to add label entities to.
 * @param fontAtlas - The font atlas every label draws from.
 * @param whiteSprite - A plain white sprite template for the guide boxes.
 * @param guideLayer - The draw-order layer for guide boxes (drawn behind text).
 * @param contentLayer - The draw-order layer for captions/body text.
 * @param topLeft - This section's top-left corner, in world units.
 * @param usableWidth - The total width available to lay the 3 columns out in.
 * @returns The y coordinate immediately below the section's content, for
 * stacking the next section beneath it.
 */
export function createLineHeightExamples(
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
  const boxTop = topLeft.y - captionGap;

  let sectionBottom = boxTop;

  columns.forEach((column, index) => {
    const x = topLeft.x + index * (columnWidth + columnGap);

    const captionEntity = world.createEntity();
    addPositionComponent(world, captionEntity, {
      world: { x, y: topLeft.y },
    });
    addTextComponent(world, captionEntity, {
      text: column.label,
      fontAtlas,
      size: captionSize,
      color: captionColor,
      layer: contentLayer,
    });

    const { bounds } = shapeText(sampleText, fontAtlas.data, {
      size: bodySize,
      lineHeight: column.lineHeight,
      maxWidth: columnWidth,
    });

    createGuideBox(
      world,
      whiteSprite,
      { x, y: boxTop },
      { x: columnWidth, y: bounds.height },
      guideLayer,
    );

    const textEntity = world.createEntity();
    addPositionComponent(world, textEntity, { world: { x, y: boxTop } });
    addTextComponent(world, textEntity, {
      text: sampleText,
      fontAtlas,
      size: bodySize,
      lineHeight: column.lineHeight,
      maxWidth: columnWidth,
      color: bodyColor,
      layer: contentLayer,
    });

    sectionBottom = Math.min(sectionBottom, boxTop - bounds.height);
  });

  return sectionBottom;
}
