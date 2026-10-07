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

const paragraph =
  "Rich text tags style part of a string: <b>bold</b> words, <color=#ff7a3d>colored</color> words, and <b><color=#5cc8ff>both at once</color></b>. Tags are stripped before shaping, so this paragraph <color=#9be564>wraps and kerns exactly as it would without them</color>. Markup that isn't a tag stays literal: HP < 50%.";
const outlinedText = '<b>Bold</b> and regular, outlined';
const bodySize = 16;
const outlinedSize = 24;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.9, 0.92, 0.96, 1);
const outlineColor = new Color(1, 0.55, 0.15, 1);
const captionGap = 14;
const rowGap = 12;

/**
 * Builds the rich text section: a wrapped paragraph mixing `<b>` and
 * `<color>` tags, and a bold word next to a regular one with an outline, to
 * show the outline following the thickened bold ink.
 * @param world - The ECS world to add label entities to.
 * @param fontAtlas - The font atlas every label draws from.
 * @param whiteSprite - A plain white sprite template for the guide box.
 * @param guideLayer - The draw-order layer for the guide box (drawn behind text).
 * @param contentLayer - The draw-order layer for the caption/body text.
 * @param topLeft - This section's top-left corner, in world units.
 * @param usableWidth - The total width available to lay the example out in.
 * @returns The y coordinate immediately below the section's content.
 */
export function createRichTextExample(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  whiteSprite: SpriteEcsComponent,
  guideLayer: number,
  contentLayer: number,
  topLeft: Vector2,
  usableWidth: number,
): number {
  const captionEntity = world.createEntity();
  addPositionComponent(world, captionEntity, {
    local: { x: topLeft.x, y: topLeft.y },
  });
  addTextComponent(world, captionEntity, {
    text: 'rich text tags: b and color=#rrggbb',
    fontAtlas,
    size: captionSize,
    color: captionColor,
    layer: contentLayer,
  });

  // `shapeText` parses tags too, so the guide box is sized from exactly the
  // text that's drawn.
  const { bounds: paragraphBounds } = shapeText(paragraph, fontAtlas.data, {
    size: bodySize,
    maxWidth: usableWidth,
  });
  const { bounds: outlinedBounds } = shapeText(outlinedText, fontAtlas.data, {
    size: outlinedSize,
  });

  const paragraphTop = topLeft.y - captionGap;
  const outlinedTop = paragraphTop - paragraphBounds.height - rowGap;

  createGuideBox(
    world,
    whiteSprite,
    { x: topLeft.x, y: paragraphTop },
    { x: usableWidth, y: paragraphBounds.height },
    guideLayer,
  );

  const paragraphEntity = world.createEntity();
  addPositionComponent(world, paragraphEntity, {
    local: { x: topLeft.x, y: paragraphTop },
  });
  addTextComponent(world, paragraphEntity, {
    text: paragraph,
    fontAtlas,
    size: bodySize,
    color: bodyColor,
    maxWidth: usableWidth,
    layer: contentLayer,
  });

  const outlinedEntity = world.createEntity();
  addPositionComponent(world, outlinedEntity, {
    local: { x: topLeft.x, y: outlinedTop },
  });
  addTextComponent(world, outlinedEntity, {
    text: outlinedText,
    fontAtlas,
    size: outlinedSize,
    color: bodyColor,
    outlineColor,
    outlineWidth: 1.5,
    layer: contentLayer,
  });

  return outlinedTop - outlinedBounds.height;
}
