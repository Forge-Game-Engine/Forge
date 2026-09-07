import {
  addPositionComponent,
  PositionEcsComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  Color,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';

// A fully opaque, dark tint rather than a translucent one: a dark,
// canvas-distinct color is what reads as a faint "panel" against the
// demo's black background, without relying on partial transparency.
export const guideBoxColor = new Color(0.16, 0.17, 0.21, 1);

/**
 * Creates a translucent rectangle, top-left anchored at `topLeft`, sized to
 * `size`: a visual guide showing the `maxWidth`/height column a nearby
 * `TextEcsComponent` is laid out against. Top-left anchoring (rather than
 * the sprite's own center pivot) matches how a `TextEcsComponent`'s own
 * bounds are anchored to its entity position (see `shapeText`'s
 * `verticalAlign: 'top'` default), so a box built from the same `topLeft`
 * a label uses frames that label's block exactly.
 * @param world - The ECS world to add the guide box entity to.
 * @param spriteTemplate - A plain white sprite (from `createImageSprite`)
 * to tint and resize into the box.
 * @param topLeft - The box's top-left corner, in world units.
 * @param size - The box's width/height, in world units.
 * @param layer - The render layer to draw the box on (behind the text it frames).
 * @returns The guide box's `SpriteEcsComponent` and `PositionEcsComponent`,
 * so a caller can resize/reposition it later (see `_live-max-width.system.ts`).
 */
export function createGuideBox(
  world: EcsWorld,
  spriteTemplate: SpriteEcsComponent,
  topLeft: Vector2,
  size: Vector2,
  layer: number,
): { sprite: SpriteEcsComponent; position: PositionEcsComponent } {
  const entity = world.createEntity();

  const position = addPositionComponent(world, entity, {
    world: { x: topLeft.x + size.x / 2, y: topLeft.y - size.y / 2 },
  });

  const sprite = addSpriteComponent(world, entity, {
    ...spriteTemplate,
    width: size.x,
    height: size.y,
    tintColor: guideBoxColor,
    layer,
  });

  return { sprite, position };
}
