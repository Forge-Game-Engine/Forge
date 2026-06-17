import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Recursively removes an entity and every entity in its subtree from the world.
 *
 * The walk follows {@link ParentEcsComponent} relationships: any entity whose
 * `parent` field equals `entity` is treated as a direct child and destroyed
 * first (depth-first). After all descendants have been removed, the root entity
 * itself is removed via {@link EcsWorld.removeEntity}.
 *
 * Widget factories call this from their `destroy()` handle to ensure the full
 * entity tree is cleaned up in one call. Callers are responsible for clearing
 * any `ParameterizedForgeEvent` listeners on components before (or after)
 * calling this function, as `removeEntity` removes component data from the
 * sparse sets but does not call `clear()` on events.
 *
 * @param world - The ECS world that owns the entity.
 * @param entity - The root entity of the subtree to destroy.
 */
export function destroyUiSubtree(world: EcsWorld, entity: number): void {
  const candidates: number[] = [];

  world.queryEntities([parentId], candidates);

  for (const child of candidates) {
    const parentComp = world.getComponent(child, parentId);

    if (parentComp?.parent === entity) {
      destroyUiSubtree(world, child);
    }
  }

  world.removeEntity(entity);
}
