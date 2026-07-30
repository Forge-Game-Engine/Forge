import {
  LifetimeEcsComponent,
  lifetimeId,
} from '../components/lifetime-component.js';
import { RemoveFromWorldLifetimeStrategyId } from '../strategies/remove-from-world-strategy-component.js';

import { EcsSystem } from '../../ecs/ecs-system.js';

/**
 * Creates an ECS system to handle removing expired entities from the world.
 */
export const createRemoveFromWorldEcsSystem = (): EcsSystem<
  [LifetimeEcsComponent]
> => ({
  query: [lifetimeId],
  tags: [RemoveFromWorldLifetimeStrategyId],
  update: (world, { entities, components: [lifetimeComponents] }) => {
    for (let i = 0; i < entities.length; i++) {
      if (lifetimeComponents[i].hasExpired) {
        world.removeEntity(entities[i]);
      }
    }
  },
});
