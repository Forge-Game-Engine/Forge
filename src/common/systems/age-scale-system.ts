import { ScaleEcsComponent, scaleId } from '../../common/index.js';
import {
  LifetimeEcsComponent,
  lifetimeId,
} from '../../lifecycle/components/lifetime-component.js';
import {
  AgeScaleEcsComponent,
  ageScaleId,
} from '../components/age-scale-component.js';
import { EcsSystem } from '../../new-ecs/ecs-system.js';

/**
 * Creates an ECS system to handle age-based scaling of entities.
 * @returns An ECS system that updates the scale of entities based on their lifetime.
 */
export const createAgeScaleEcsSystem = (): EcsSystem<
  [LifetimeEcsComponent, ScaleEcsComponent, AgeScaleEcsComponent]
> => ({
  query: [lifetimeId, scaleId, ageScaleId],
  run: (result) => {
    const [lifetimeComponent, scaleComponent, ageScaleComponent] =
      result.components;

    const lifetimeRatio =
      lifetimeComponent.elapsedSeconds / lifetimeComponent.durationSeconds;
    const newScaleX =
      ageScaleComponent.originalScaleX * (1 - lifetimeRatio) +
      ageScaleComponent.finalLifetimeScaleX * lifetimeRatio;
    const newScaleY =
      ageScaleComponent.originalScaleY * (1 - lifetimeRatio) +
      ageScaleComponent.finalLifetimeScaleY * lifetimeRatio;
    scaleComponent.local.x = newScaleX;
    scaleComponent.local.y = newScaleY;
  },
});
