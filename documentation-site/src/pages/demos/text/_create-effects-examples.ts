import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  shapeText,
} from '@forge-game-engine/forge/text';
import { createGuideBox } from './_create-guide-box';

// A short, ordinary phrase - deliberately not pushed toward this atlas's
// worst-case glyphs (acute-corner caps, tight counters) or toward the edge
// of the documented safe outline/shadow range. See
// `documentation-site/docs/docs/text/text-effects.md`'s "Choosing a safe
// range" section for why this demo stays conservative rather than
// showcasing the effect's absolute maximum.
const sampleText = 'Forge Engine';
const bodySize = 22;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.85, 0.87, 0.92, 1);
const captionGap = 14;
const columnGap = 18;

// At this caption-scale body size, the *neighbor* clamp (not the atlas's
// own budget) is what actually limits these values - "Forge Engine"'s
// tightest same-word letter pair ("rg" in "Forge") only allows about 1
// screen-pixel-range unit here (see text-effects.md's "Choosing a safe
// range": the neighbor budget is roughly a fixed percentage of the font's
// *on-screen* size, so small caption text only ever has a little of it to
// spend). This deliberately stays under that, not the atlas's own larger
// budget - see the hero example below for what a bigger, bolder effect
// looks like once the text itself is rendered large enough to afford it.
const outlineWidth = 1;
const shadowSoftness = 1.2;
const shadowOffset: Vector2 = { x: 0.8, y: -0.8 };

interface EffectsColumn {
  label: string;
  outlineColor: Color;
  outlineWidth: number;
  shadowColor: Color;
  shadowOffset: Vector2;
  shadowSoftness: number;
}

const transparent = Color.transparent;

const columns: EffectsColumn[] = [
  {
    label: 'base (no effect)',
    outlineColor: Color.black,
    outlineWidth: 0,
    shadowColor: transparent,
    shadowOffset: { x: 0, y: 0 },
    shadowSoftness: 0,
  },
  {
    label: 'outline',
    // A saturated, high-contrast color (not a realistic near-black outline)
    // so the effect actually reads clearly at demo scale - the "safe"
    // outlineWidth budget documented in text-effects.md is about *size*,
    // not color, so this doesn't misrepresent it.
    outlineColor: new Color(1, 0.55, 0.15, 1),
    outlineWidth,
    shadowColor: transparent,
    shadowOffset: { x: 0, y: 0 },
    shadowSoftness: 0,
  },
  {
    label: 'soft shadow / glow',
    outlineColor: Color.black,
    outlineWidth: 0,
    shadowColor: new Color(0.15, 0.65, 1, 0.95),
    shadowOffset,
    shadowSoftness,
  },
];

/**
 * Builds a 3-column showcase of `TextEcsComponent`'s outline/soft-shadow
 * effects: unmodified text, an outlined column, and a soft-shadow/glow
 * column, all using the same conservative, documented-safe effect values
 * (see the module-level comments above) rather than this atlas's absolute
 * maximum.
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

  // Sized from shapeText's own computed bounds (matching every other
  // section in this demo), not guessed - `maxWidth: columnWidth` also
  // guarantees the sample text can never visually overflow into the next
  // column, whatever its wrapped height ends up being.
  const { bounds } = shapeText(sampleText, fontAtlas.data, {
    size: bodySize,
    maxWidth: columnWidth,
  });

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
      maxWidth: columnWidth,
      color: bodyColor,
      layer: contentLayer,
      outlineColor: column.outlineColor,
      outlineWidth: column.outlineWidth,
      shadowColor: column.shadowColor,
      shadowOffset: column.shadowOffset,
      shadowSoftness: column.shadowSoftness,
    });
  });

  return boxTop - bounds.height;
}
