import { EcsWorld } from '../../ecs/ecs-world.js';
import { lerp } from '../../math/lerp.js';
import { lerpAngle } from '../../math/lerp-angle.js';
import { clamp } from '../../math/clamp.js';
import { positionId } from '../components/position-component.js';
import { rotationId } from '../components/rotation-component.js';
import { scaleId } from '../components/scale-component.js';
import {
  LocalTransformSnapshot,
  transformInterpolationId,
} from '../components/transform-interpolation-component.js';
import { Time } from '../time/Time.js';

/**
 * Copies an entity's local position, rotation and scale into `snapshot`,
 * using the identity values for the ones the entity doesn't have.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to copy from.
 * @param snapshot - The snapshot to write.
 */
export function copyLocalTransformInto(
  world: EcsWorld,
  entity: number,
  snapshot: LocalTransformSnapshot,
): void {
  const position = world.getComponent(entity, positionId);
  const rotation = world.getComponent(entity, rotationId);
  const scale = world.getComponent(entity, scaleId);

  snapshot.position.x = position ? position.local.x : 0;
  snapshot.position.y = position ? position.local.y : 0;
  snapshot.rotation = rotation ? rotation.local : 0;
  snapshot.scale.x = scale ? scale.local.x : 1;
  snapshot.scale.y = scale ? scale.local.y : 1;
}

// Whether the entity's local transform still equals `snapshot`, comparing
// only the transform components it has. `snapshot` is a copy of `local`, so
// they're equal until something writes `local`.
function matchesLocalTransform(
  world: EcsWorld,
  entity: number,
  snapshot: LocalTransformSnapshot,
): boolean {
  const position = world.getComponent(entity, positionId);

  if (
    position &&
    (position.local.x !== snapshot.position.x ||
      position.local.y !== snapshot.position.y)
  ) {
    return false;
  }

  const rotation = world.getComponent(entity, rotationId);

  if (rotation && rotation.local !== snapshot.rotation) {
    return false;
  }

  const scale = world.getComponent(entity, scaleId);

  return (
    !scale ||
    (scale.local.x === snapshot.scale.x && scale.local.y === snapshot.scale.y)
  );
}

/**
 * Writes the local transform the transform system composes an entity's
 * `world` from into `out`. That's `local` itself, except outside a fixed step
 * for an entity with a `TransformInterpolationEcsComponent` whose `local`
 * still equals its `stepEnd`: then it's the blend of `stepStart` and
 * `stepEnd` by `time.fixedOverstepFraction`, clamped to `[0, 1]`, with
 * rotation blended the shorter way around.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to resolve.
 * @param time - The time whose fixed step and overstep fraction to read.
 * @param out - The snapshot to write.
 */
export function resolveDrawnLocalTransform(
  world: EcsWorld,
  entity: number,
  time: Time,
  out: LocalTransformSnapshot,
): void {
  const interpolation = world.getComponent(entity, transformInterpolationId);

  if (
    time.isInFixedStep ||
    !interpolation ||
    !matchesLocalTransform(world, entity, interpolation.stepEnd)
  ) {
    copyLocalTransformInto(world, entity, out);

    return;
  }

  const alpha = clamp(time.fixedOverstepFraction, 0, 1);
  const { stepStart, stepEnd } = interpolation;

  out.position.x = lerp(stepStart.position.x, stepEnd.position.x, alpha);
  out.position.y = lerp(stepStart.position.y, stepEnd.position.y, alpha);
  out.rotation = lerpAngle(stepStart.rotation, stepEnd.rotation, alpha);
  out.scale.x = lerp(stepStart.scale.x, stepEnd.scale.x, alpha);
  out.scale.y = lerp(stepStart.scale.y, stepEnd.scale.y, alpha);
}
