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

// Long enough to wrap onto 3 lines with a noticeably short last line -
// that's what makes left vs. center vs. right vs. justify visibly differ;
// a two-line wrap where both lines are nearly the same width doesn't.
const sampleText =
  'Pack my box with five dozen liquor jugs and a case of vintage wine.';
const bodySize = 15;
const bodyLineHeight = 1.15;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.85, 0.87, 0.92, 1);
const captionGap = 20;
const columnGap = 18;

const columns: { label: string; horizontalAlign: 'left' | 'center' | 'right' | 'justify' }[] =
  [
    { label: 'left (default)', horizontalAlign: 'left' },
    { label: 'center', horizontalAlign: 'center' },
    { label: 'right', horizontalAlign: 'right' },
    { label: 'justify', horizontalAlign: 'justify' },
  ];

/**
 * Builds a 4-column showcase of every `horizontalAlign` value
 * (`left`/`center`/`right`/`justify`), all wrapping the same sentence at the
 * same `maxWidth` so alignment is the only thing that varies between
 * columns. Each column gets a guide box (see `createGuideBox`) framing the
 * shared `maxWidth`/computed-height column the text is aligned within.
 * @param world - The ECS world to add label entities to.
 * @param fontAtlas - The font atlas every label draws from.
 * @param whiteSprite - A plain white sprite template for the guide boxes.
 * @param guideLayer - The draw-order layer for guide boxes (drawn behind text).
 * @param contentLayer - The draw-order layer for captions/body text.
 * @param topLeft - This section's top-left corner, in world units.
 * @param usableWidth - The total width available to lay the 4 columns out in.
 * @returns The y coordinate immediately below the section's content, for
 * stacking the next section beneath it.
 */
export function createHorizontalAlignmentExamples(
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
      lineHeight: bodyLineHeight,
      horizontalAlign: column.horizontalAlign,
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
      lineHeight: bodyLineHeight,
      horizontalAlign: column.horizontalAlign,
      maxWidth: columnWidth,
      color: bodyColor,
      layer: contentLayer,
    });

    sectionBottom = Math.min(sectionBottom, boxTop - bounds.height);
  });

  return sectionBottom;
}
