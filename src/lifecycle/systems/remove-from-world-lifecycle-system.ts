import {
  LifetimeEcsComponent,
  lifetimeId,
} from '../components/lifetime-component.js';
import { RemoveFromWorldLifetimeStrategyId } from '../strategies/remove-from-world-strategy-component.js';

import { EcsSystem } from '../../new-ecs/ecs-system.js';

/**
 * Creates an ECS system to handle removing expired entities from the world.
 */
export const createRemoveFromWorldEcsSystem = (): EcsSystem<
  [LifetimeEcsComponent]
> => ({
  query: [lifetimeId, RemoveFromWorldLifetimeStrategyId],
  run: (result, world) => {
    const [lifetimeComponent] = result.components;

    if (lifetimeComponent.hasExpired) {
      world.removeEntity(result.entity);
    }
  },
});
