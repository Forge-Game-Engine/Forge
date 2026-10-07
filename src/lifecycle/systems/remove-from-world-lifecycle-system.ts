import {
  LifetimeEcsComponent,
  lifetimeId,
} from '../components/lifetime-component.js';
import { RemoveFromWorldLifetimeStrategyId } from '../strategies/remove-from-world-strategy-component.js';

import { EcsSystem } from '../../ecs/ecs-system.js';

/**
 * Creates an ECS system that removes every entity tagged with
 * `RemoveFromWorldLifetimeStrategyId` whose {@link LifetimeEcsComponent}
 * has expired. Register it after `createLifetimeTrackingEcsSystem`, so an
 * entity is removed on the tick it expires.
 * @returns The ECS system.
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
