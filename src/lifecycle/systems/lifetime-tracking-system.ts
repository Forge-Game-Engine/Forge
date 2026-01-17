import { Time } from '../../common';
import { EcsSystem } from '../../new-ecs/ecs-system.js';
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
  run: (result) => {
    const [lifetimeComponent] = result.components;

    lifetimeComponent.elapsedSeconds += time.deltaTimeInSeconds;

    if (lifetimeComponent.elapsedSeconds >= lifetimeComponent.durationSeconds) {
      lifetimeComponent.hasExpired = true;
    }
  },
});
