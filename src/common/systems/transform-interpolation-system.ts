import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  PositionEcsComponent,
  positionId,
  TransformInterpolationEcsComponent,
  transformInterpolationId,
} from '../components/index.js';
import { copyLocalTransformInto } from '../transforms/local-transform-snapshot.js';

/**
 * Creates the system that records each interpolated entity's local transform
 * at the end of a fixed step, in its
 * `TransformInterpolationEcsComponent.stepEnd`.
 *
 * Register it last in the fixed-update group (`registerFixedUpdate`), after
 * the physics systems and every game system that moves entities in fixed
 * steps. A move made after it is drawn as a teleport: at `local`, until the
 * next step. Without it, interpolated entities are drawn at `local`.
 * @returns The ECS system.
 */
export const createTransformInterpolationEcsSystem = (): EcsSystem<
  [TransformInterpolationEcsComponent, PositionEcsComponent]
> => ({
  query: [transformInterpolationId, positionId],
  update: (world, { entities, components: [interpolations] }) => {
    for (let i = 0; i < entities.length; i++) {
      copyLocalTransformInto(world, entities[i], interpolations[i].stepEnd);
    }
  },
});
