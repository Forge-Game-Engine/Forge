import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * The transform components of one end of a joint, spring or damper.
 */
export interface JointBodyTransform {
  readonly position: PositionEcsComponent;
  readonly rotation: RotationEcsComponent;
}

/**
 * Finds the transform components `entity` needs to be one end of a joint,
 * spring or damper this step: its `PositionEcsComponent` and
 * `RotationEcsComponent`. A removed entity has neither.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to look up.
 * @returns The entity's position and rotation, or `null` if it's missing
 * either.
 */
export function getJointBodyTransform(
  world: EcsWorld,
  entity: number,
): JointBodyTransform | null {
  const position = world.getComponent(entity, positionId);
  const rotation = world.getComponent(entity, rotationId);

  if (position === null || rotation === null) {
    return null;
  }

  return { position, rotation };
}

/**
 * Whether `entity` can be one end of a joint, spring or damper this step
 * (see {@link getJointBodyTransform}). The joint systems skip a joint
 * unless both of its entities pass, and the sleep system counts a joint as
 * linking its bodies under the same condition, so a joint links bodies
 * exactly when it's solved.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to check.
 * @returns Whether `entity` has a position and a rotation.
 */
export function hasJointBody(world: EcsWorld, entity: number): boolean {
  return getJointBodyTransform(world, entity) !== null;
}
