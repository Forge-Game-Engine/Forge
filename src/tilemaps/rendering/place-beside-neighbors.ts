// Where the tilemap render system places a new mesh entity among a layer's
// children. Not exported from the package.

import type { EcsWorld } from '../../ecs/ecs-world.js';

const isChildOf = (world: EcsWorld, entity: number, parent: number): boolean =>
  world.isAlive(entity) && world.getParent(entity) === parent;

/**
 * Where the entity at `index` of `ordered` goes among the layer's children,
 * so the system's own entities keep `ordered`'s order: at the place of the
 * nearest later one that's a child of the layer, so it lands just in front
 * of it, or else just behind the nearest earlier one, or else first.
 * Entities of `ordered` that aren't children of the layer (yet) are
 * skipped, and so are the game's own children, which keep their places.
 * @param world - The world the entities belong to.
 * @param layerEntity - The layer entity.
 * @param ordered - The system's entities for the layer, in the order they
 * belong in.
 * @param index - The index, in `ordered`, of the entity to place.
 * @returns The sibling index to give it.
 */
export const getSiblingIndexBesideNeighbors = (
  world: EcsWorld,
  layerEntity: number,
  ordered: readonly { readonly entity: number }[],
  index: number,
): number => {
  for (let next = index + 1; next < ordered.length; next++) {
    if (isChildOf(world, ordered[next].entity, layerEntity)) {
      return world.getSiblingIndex(ordered[next].entity);
    }
  }

  for (let previous = index - 1; previous >= 0; previous--) {
    if (isChildOf(world, ordered[previous].entity, layerEntity)) {
      return world.getSiblingIndex(ordered[previous].entity) + 1;
    }
  }

  return 0;
};
