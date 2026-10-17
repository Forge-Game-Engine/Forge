import { EcsWorld } from '../../ecs/ecs-world.js';
import { trailId } from './components/trail-component.js';

/**
 * Empties an entity's trail, so it starts again from where the entity is.
 * Call it when the entity teleports or respawns, so its trail isn't drawn
 * across the jump. The trail system clears the points the next time
 * it runs, which is the same frame when this is called from game logic
 * that runs before it.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity whose trail to clear.
 * @throws An error if the entity has no trail.
 */
export function clearTrail(world: EcsWorld, entity: number): void {
  const trail = world.getComponent(entity, trailId);

  if (!trail) {
    throw new Error(
      `Unable to clear the trail of entity ${entity}, it has no TrailEcsComponent.`,
    );
  }

  trail.clearRequests++;
}
