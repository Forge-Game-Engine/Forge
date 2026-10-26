import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { positionId, rotationId, scaleId } from '../components/index.js';

/**
 * Maps a point from world space to an entity's local space, the inverse of
 * `localToWorldPoint`: the point is moved by the negated world position,
 * rotated back and divided by the world scale. Like Godot's
 * `Node2D.to_local` and Unity's `Transform.InverseTransformPoint`. Mouse
 * picking maps the pointer to world space with a `CameraView` and then into
 * the local space of what it picks with this.
 *
 * It only reads the world transform, which `createTransformEcsSystem`
 * writes, so it sees the transform from that system's last pass. For an
 * entity with a `TransformInterpolationEcsComponent`, a point converted
 * outside a fixed step goes through the pose the entity is drawn at, and one
 * converted inside a fixed step, after the step's transform system, through
 * its simulated pose.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity whose local space to map the point into. Its
 * rotation and scale are optional (`0` and `(1, 1)` without them).
 * @param point - The point, in world space.
 * @returns A new `Vector2` holding the point in the entity's local space.
 * @throws An error if the entity has no `PositionEcsComponent`, or its world
 * scale is `0` on either axis, since no local point maps to world space
 * then.
 */
export function worldToLocalPoint(
  world: EcsWorld,
  entity: number,
  point: Vector2,
): Vector2 {
  const position = world.getComponent(entity, positionId);

  if (!position) {
    throw new Error(
      `Unable to map a point from world space to the local space of entity ${entity}: the entity has no PositionEcsComponent.`,
    );
  }

  const rotation = world.getComponent(entity, rotationId);
  const scale = world.getComponent(entity, scaleId);
  const result = Vec2.subtract(Vec2.clone(point), position.world);

  if (rotation) {
    Vec2.rotate(result, -rotation.world);
  }

  if (!scale) {
    return result;
  }

  if (scale.world.x === 0 || scale.world.y === 0) {
    throw new Error(
      `Unable to map a point from world space to the local space of entity ${entity}: its world scale (${scale.world.x}, ${scale.world.y}) is 0 on an axis, so no local point maps to world space.`,
    );
  }

  result.x /= scale.world.x;
  result.y /= scale.world.y;

  return result;
}
