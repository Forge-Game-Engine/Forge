import { ScaleEcsComponent, scaleId } from '../../common/index.js';
import {
  LifetimeEcsComponent,
  lifetimeId,
} from '../../lifecycle/components/lifetime-component.js';
import {
  AgeScaleEcsComponent,
  ageScaleId,
} from '../components/age-scale-component.js';
import { EcsSystem } from '../../ecs/ecs-system.js';

/**
 * Creates an ECS system to handle age-based scaling of entities.
 * @returns An ECS system that updates the scale of entities based on their lifetime.
 */
export const createAgeScaleEcsSystem = (): EcsSystem<
  [LifetimeEcsComponent, ScaleEcsComponent, AgeScaleEcsComponent]
> => ({
  query: [lifetimeId, scaleId, ageScaleId],
  update: (_world, { components: [lifetimes, scales, ageScales] }) => {
    for (let i = 0; i < lifetimes.length; i++) {
      const lifetime = lifetimes[i];
      const scale = scales[i];
      const ageScale = ageScales[i];

      const lifetimeRatio = lifetime.elapsedSeconds / lifetime.durationSeconds;
      const invertedRatio = 1 - lifetimeRatio;

      scale.local.x =
        ageScale.originalScaleX * invertedRatio +
        ageScale.finalLifetimeScaleX * lifetimeRatio;
      scale.local.y =
        ageScale.originalScaleY * invertedRatio +
        ageScale.finalLifetimeScaleY * lifetimeRatio;
    }
  },
});
