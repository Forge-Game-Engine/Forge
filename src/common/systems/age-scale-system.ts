import { ScaleEcsComponent, scaleId } from '../../common/index.js';
import {
  LifetimeEcsComponent,
  lifetimeId,
} from '../../lifecycle/components/lifetime-component.js';
import {
  AgeScaleEcsComponent,
  ageScaleId,
} from '../components/age-scale-component.js';
import { parentId } from '../components/parent-component.js';
import { EcsSystem } from '../../ecs/ecs-system.js';

/**
 * Creates an ECS system to handle age-based scaling of entities.
 *
 * For an entity with no `ParentEcsComponent`, the system writes the world
 * scale as well as the local one, so the scale shows on screen without
 * `createTransformEcsSystem`.
 * @returns An ECS system that updates the scale of entities based on their lifetime.
 */
export const createAgeScaleEcsSystem = (): EcsSystem<
  [LifetimeEcsComponent, ScaleEcsComponent, AgeScaleEcsComponent]
> => ({
  query: [lifetimeId, scaleId, ageScaleId],
  update: (world, { entities, components: [lifetimes, scales, ageScales] }) => {
    for (let i = 0; i < entities.length; i++) {
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

      // A parented entity's world scale depends on its parent's, which only
      // the transform system knows how to combine.
      if (!world.getComponent(entities[i], parentId)) {
        scale.world.x = scale.local.x;
        scale.world.y = scale.local.y;
      }
    }
  },
});
