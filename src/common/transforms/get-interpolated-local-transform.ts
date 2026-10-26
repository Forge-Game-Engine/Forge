import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { positionId } from '../components/index.js';
import { Time } from '../time/index.js';
import { resolveDrawnLocalTransform } from './local-transform-snapshot.js';

const createDrawnLocalTransform = (
  world: EcsWorld,
  entity: number,
  time: Time,
): { position: Vector2; rotation: number; scale: Vector2 } => {
  const drawn = { position: Vec2.zero, rotation: 0, scale: Vec2.one };

  resolveDrawnLocalTransform(world, entity, time, drawn);

  return drawn;
};

/**
 * Gets an entity's local position as the transform system's once-per-frame
 * pass draws it: for an entity with a `TransformInterpolationEcsComponent`
 * whose `local` equals its `stepEnd`, the blend of its `stepStart` and
 * `stepEnd` by `time.fixedOverstepFraction`, and `position.local` otherwise.
 * Inside a fixed step, it's `position.local`. For an entity without a parent,
 * such as a rigid body, it's the world position the entity is drawn at this
 * frame.
 *
 * Read it to place something on screen from a moving body, such as a camera
 * that follows the body or a sprite drawn between two bodies, in a system
 * that runs before the frame's transform system. Game logic reads
 * `position.local`, the pose the simulation continues from.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to read.
 * @param time - The time whose fixed step and overstep fraction the blend
 * uses.
 * @returns A new `Vector2` holding the position.
 * @throws An error if the entity has no `PositionEcsComponent`.
 */
export function getInterpolatedLocalPosition(
  world: EcsWorld,
  entity: number,
  time: Time,
): Vector2 {
  if (!world.getComponent(entity, positionId)) {
    throw new Error(
      `Unable to get the interpolated local position of entity ${entity}: the entity has no PositionEcsComponent.`,
    );
  }

  return createDrawnLocalTransform(world, entity, time).position;
}

/**
 * Gets an entity's local rotation as the transform system's once-per-frame
 * pass draws it, the way {@link getInterpolatedLocalPosition} does for its
 * position. Rotation is blended the shorter way around.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to read.
 * @param time - The time whose fixed step and overstep fraction the blend
 * uses.
 * @returns The rotation in radians, or `0` if the entity has no
 * `RotationEcsComponent`.
 */
export function getInterpolatedLocalRotation(
  world: EcsWorld,
  entity: number,
  time: Time,
): number {
  return createDrawnLocalTransform(world, entity, time).rotation;
}
