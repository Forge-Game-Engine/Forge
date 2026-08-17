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

// The safe outline/shadow budget is a fixed *fraction* of a glyph's
// on-screen size - the atlas's own encoded distanceRange for `outlineWidth`,
// and additionally, for a multi-letter word, its tightest same-word letter
// gap for `shadowSoftness`/`shadowOffset` (see text-effects.md's "Choosing
// a safe range") - so a large, clearly-visible effect needs correspondingly
// large on-screen text, the same way a thick CSS text-stroke needs a large
// font-size to read as anything but a smudge. This hero example renders one
// big word specifically to prove that scaling relationship: at this size,
// `outlineWidth`/`shadowSoftness` can go well beyond the small-caption
// showcase above and still render at full, uncapped strength.
const heroText = 'FORGE';
const heroSize = 80;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.85, 0.87, 0.92, 1);
const captionGap = 14;

const heroOutlineColor = new Color(1, 0.55, 0.15, 1);
const heroOutlineWidth = 6;
const heroShadowColor = new Color(0.15, 0.65, 1, 0.85);
const heroShadowOffset: Vector2 = { x: 3, y: -3 };
const heroShadowSoftness = 7;

/**
 * Builds a single large "hero" word with both an outline and a soft
 * shadow/glow applied together, at a big enough on-screen size for
 * `outlineWidth`/`shadowSoftness` to read as genuinely large and soft,
 * proving the effect's size scales with the requested values (not silently
 * capped to a sliver) once there's enough room in the shaders' safe-distance
 * budgets (`msdf-effects.frag`) to actually use them.
 * @param world - The ECS world to add label entities to.
 * @param fontAtlas - The font atlas every label draws from.
 * @param whiteSprite - A plain white sprite template for the guide box.
 * @param guideLayer - The draw-order layer for the guide box (drawn behind text).
 * @param contentLayer - The draw-order layer for the caption/body text.
 * @param topLeft - This section's top-left corner, in world units.
 * @param usableWidth - The total width available to lay the example out in.
 * @returns The y coordinate immediately below the section's content.
 */
export function createEffectsHeroExample(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  whiteSprite: SpriteEcsComponent,
  guideLayer: number,
  contentLayer: number,
  topLeft: Vector2,
  usableWidth: number,
): number {
  const boxTop = topLeft.y - captionGap;

  const captionEntity = world.createEntity();
  addPositionComponent(world, captionEntity, {
    world: { x: topLeft.x, y: topLeft.y },
  });
  addTextComponent(world, captionEntity, {
    text: `outline + soft shadow / glow together, at a larger size (outlineWidth: ${heroOutlineWidth}, shadowSoftness: ${heroShadowSoftness})`,
    fontAtlas,
    size: captionSize,
    color: captionColor,
    layer: contentLayer,
  });

  const { bounds } = shapeText(heroText, fontAtlas.data, { size: heroSize });

  createGuideBox(
    world,
    whiteSprite,
    { x: topLeft.x, y: boxTop },
    { x: usableWidth, y: bounds.height },
    guideLayer,
  );

  const textEntity = world.createEntity();
  addPositionComponent(world, textEntity, {
    world: { x: topLeft.x, y: boxTop },
  });
  addTextComponent(world, textEntity, {
    text: heroText,
    fontAtlas,
    size: heroSize,
    color: bodyColor,
    layer: contentLayer,
    outlineColor: heroOutlineColor,
    outlineWidth: heroOutlineWidth,
    shadowColor: heroShadowColor,
    shadowOffset: heroShadowOffset,
    shadowSoftness: heroShadowSoftness,
  });

  return boxTop - bounds.height;
}
