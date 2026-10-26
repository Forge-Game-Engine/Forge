import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ColliderEcsComponent,
  colliderId,
} from '@forge-game-engine/forge/physics';
import { TriggerAction } from '@forge-game-engine/forge/input';
import { trapdoorId } from './_create-level';

/**
 * Creates the system that removes the trapdoor when `openTrapdoor` is
 * triggered. Nothing here wakes the pyramid on it: the sleep system
 * recorded the trapdoor as a partner of the boxes resting on it, and wakes
 * their island on its next step when that partner is gone.
 * @param openTrapdoor - The action that opens the trapdoor.
 * @returns The ECS system.
 */
export const createTrapdoorEcsSystem = (
  openTrapdoor: TriggerAction,
): EcsSystem<[ColliderEcsComponent]> => ({
  query: [colliderId],
  tags: [trapdoorId],
  update: (world, { entities }) => {
    if (!openTrapdoor.isTriggered) {
      return;
    }

    // Copied, so removing an entity can't change the array being iterated.
    for (const trapdoor of [...entities]) {
      world.removeEntity(trapdoor);
    }
  },
});
