import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  SpriteEcsComponent,
  spriteId,
} from '../../rendering/components/sprite-component.js';
import { createDrawOrderResolver } from '../../rendering/draw-order.js';
import {
  TextEcsComponent,
  textId,
} from '../../text/components/text-component.js';

const resolver = createDrawOrderResolver();

/**
 * Sorts UI elements into the order the render system draws them in, first
 * drawn first, so input can treat whatever is drawn on top as on top.
 *
 * An element sorts by the `layer` of its own sprite, else of its own text,
 * else `0` (an invisible hit region), then by world order (see
 * `DrawOrderEcsComponent`), then in hierarchy order. Y-sorting is left out:
 * every element of a canvas descends from the canvas entity, so they all
 * share the root a camera's `ySort` would order them by. A text drawn on a
 * different layer from its element's sprite is ordered by the sprite.
 * @param world - The ECS world the elements belong to.
 * @param entities - The elements to sort, sorted in place.
 * @returns `entities`.
 */
export function sortByDrawOrder(world: EcsWorld, entities: number[]): number[] {
  resolver.resolve(world, entities);

  const getSprite = world.getComponentAccessor<SpriteEcsComponent>(spriteId);
  const getText = world.getComponentAccessor<TextEcsComponent>(textId);
  const layerOf = (entity: number): number =>
    getSprite(entity)?.layer ?? getText(entity)?.layer ?? 0;

  return entities.sort(
    (a, b) =>
      layerOf(a) - layerOf(b) ||
      resolver.worldOrder(a) - resolver.worldOrder(b) ||
      resolver.rootSequence(a) - resolver.rootSequence(b) ||
      resolver.hierarchyIndex(a) - resolver.hierarchyIndex(b),
  );
}
