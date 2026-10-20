import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { positionId, rotationId, scaleId } from '../components/index.js';

/**
 * Maps a point from an entity's local space to world space, through the
 * entity's world position, rotation and scale: the point is scaled, then
 * rotated, then moved by the position, the same way
 * `createTransformEcsSystem` places a child in its parent. Like Godot's
 * `Node2D.to_global` and Unity's `Transform.TransformPoint`.
 *
 * It only reads the world transform, which `createTransformEcsSystem`
 * writes, so it sees the transform from that system's last pass: a point
 * converted after changing the entity's `local` values and before the
 * transform system runs uses the previous world transform.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity whose local space `point` is in. Its rotation
 * and scale are optional (`0` and `(1, 1)` without them).
 * @param point - The point, in the entity's local space.
 * @returns A new `Vector2` holding the point in world space.
 * @throws An error if the entity has no `PositionEcsComponent`.
 */
export function localToWorldPoint(
  world: EcsWorld,
  entity: number,
  point: Vector2,
): Vector2 {
  const position = world.getComponent(entity, positionId);

  if (!position) {
    throw new Error(
      `Unable to map a point from the local space of entity ${entity} to world space: the entity has no PositionEcsComponent.`,
    );
  }

  const rotation = world.getComponent(entity, rotationId);
  const scale = world.getComponent(entity, scaleId);
  const result = Vec2.clone(point);

  if (scale) {
    Vec2.multiplyComponents(result, scale.world);
  }

  if (rotation) {
    Vec2.rotate(result, rotation.world);
  }

  return Vec2.add(result, position.world);
}
