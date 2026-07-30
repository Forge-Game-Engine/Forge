import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  LifetimeEcsComponent,
  lifetimeId,
} from '../components/lifetime-component.js';

/**
 * Creates an ECS system to handle tracking lifetimes.
 */
export const createLifetimeTrackingEcsSystem = (
  time: Time,
): EcsSystem<[LifetimeEcsComponent]> => ({
  query: [lifetimeId],
  update: (_world, { components: [lifetimeComponents] }) => {
    for (const lifetimeComponent of lifetimeComponents) {
      lifetimeComponent.elapsedSeconds += time.deltaTimeInSeconds;

      if (
        lifetimeComponent.elapsedSeconds >= lifetimeComponent.durationSeconds
      ) {
        lifetimeComponent.hasExpired = true;
      }
    }
  },
});
