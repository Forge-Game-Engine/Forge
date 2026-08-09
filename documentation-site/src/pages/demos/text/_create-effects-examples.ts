import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  shapeText,
  TextEcsComponent,
} from '@forge-game-engine/forge/text';
import { createGuideBox } from './_create-guide-box';

const sampleText = 'Game Over';
const bodySize = 32;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.95, 0.97, 1, 1);
const captionGap = 20;
const columnGap = 18;
const boxPadding = 16;

const columns: {
  label: string;
  effects: Partial<TextEcsComponent>;
}[] = [
  { label: 'No effect (default)', effects: {} },
  {
    label: 'Outline',
    effects: { outlineColor: Color.black, outlineWidth: 3 },
  },
  {
    label: 'Shadow (glow)',
    effects: {
      shadowColor: new Color(0.35, 0.78, 1, 0.9),
      shadowOffset: { x: 0, y: 0 },
      shadowSoftness: 10,
    },
  },
];

/**
 * Builds a 3-column showcase of Phase 4's outline/shadow effects: the same
 * word drawn with no effect, with an opaque outline, and with a soft,
 * centered shadow (a glow). Each column gets a dark guide box behind the
 * text (see `createGuideBox`), since outline and shadow both read most
 * clearly against a background that contrasts with the glyph fill itself.
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
export function createEffectsExamples(
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
    });
    const boxWidth = Math.max(columnWidth, bounds.width + boxPadding * 2);
    const boxHeight = bounds.height + boxPadding * 2;
    const boxLeft = x + (columnWidth - boxWidth) / 2;

    createGuideBox(
      world,
      whiteSprite,
      { x: boxLeft, y: boxTop },
      { x: boxWidth, y: boxHeight },
      guideLayer,
    );

    const textEntity = world.createEntity();
    addPositionComponent(world, textEntity, {
      world: {
        x: boxLeft + (boxWidth - bounds.width) / 2,
        y: boxTop - boxPadding,
      },
    });
    addTextComponent(world, textEntity, {
      text: sampleText,
      fontAtlas,
      size: bodySize,
      color: bodyColor,
      layer: contentLayer,
      ...column.effects,
    });

    sectionBottom = Math.min(sectionBottom, boxTop - boxHeight);
  });

  return sectionBottom;
}
