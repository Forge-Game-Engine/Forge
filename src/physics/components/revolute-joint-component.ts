import { rotationId } from '../../common/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2, vector2Zero } from '../../math/index.js';

/**
 * Fields of {@link RevoluteJointEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface RevoluteJointDefaultedOptions {
  /** Anchor point, in `entityA`'s local space, the joint pins to `entityB`'s anchor. */
  localAnchorA: Vector2;
  /** Anchor point, in `entityB`'s local space, the joint pins to `entityA`'s anchor. */
  localAnchorB: Vector2;

  /** Whether the relative angle between `entityA` and `entityB` is clamped to `[lowerAngle, upperAngle]`. */
  enableLimit: boolean;
  /** The lowest relative angle (radians) allowed when `enableLimit` is `true`. */
  lowerAngle: number;
  /** The highest relative angle (radians) allowed when `enableLimit` is `true`. */
  upperAngle: number;

  /** The soft constraint's target frequency, in Hz, correcting anchor drift. */
  hertz: number;
  /** The soft constraint's damping ratio correcting anchor drift. */
  dampingRatio: number;
}

export interface RevoluteJointRequiredOptions {
  entityA: number;
  entityB: number;
}

/**
 * ECS-style component interface for a revolute (hinge) joint, pinning two
 * entities together at a shared anchor point while leaving their relative
 * rotation free (or optionally clamped between `lowerAngle`/`upperAngle`).
 * An entity referenced by `entityA`/`entityB` with no `RigidBodyEcsComponent`
 * is treated as static.
 */
export interface RevoluteJointEcsComponent
  extends RevoluteJointRequiredOptions, RevoluteJointDefaultedOptions {
  /** `entityB`'s rotation minus `entityA`'s rotation at the moment the joint was created; the zero point for the angle limit. */
  readonly referenceAngle: number;

  /** Warm-start state: the accumulated impulse of the 2-DOF point constraint. */
  accumulatedPointImpulse: Vector2;
}

export const revoluteJointId =
  createComponentId<RevoluteJointEcsComponent>('revolute-joint');

/**
 * Attaches a {@link RevoluteJointEcsComponent} to `entity`, pinning
 * `options.entityA` and `options.entityB` together at a shared anchor.
 * `entity` is a dedicated joint entity, not `entityA` or `entityB`
 * themselves. `entityA`/`entityB` must already have a `RotationEcsComponent`
 * (used to compute `referenceAngle`).
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The (dedicated) entity to attach the joint component to.
 * @param options - Options for configuring the joint.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addRevoluteJointComponent(
  world: EcsWorld,
  entity: number,
  options: RevoluteJointRequiredOptions &
    Partial<RevoluteJointDefaultedOptions>,
): RevoluteJointEcsComponent {
  const defaultOptions: RevoluteJointDefaultedOptions = {
    localAnchorA: vector2Zero(),
    localAnchorB: vector2Zero(),
    enableLimit: false,
    lowerAngle: 0,
    upperAngle: 0,
    hertz: 60,
    dampingRatio: 2,
  };

  const merged = { ...defaultOptions, ...options };

  if (merged.lowerAngle > merged.upperAngle) {
    throw new Error(
      `Unable to add revolute joint to entity "${entity}": lowerAngle (${merged.lowerAngle}) must be <= upperAngle (${merged.upperAngle}).`,
    );
  }

  const rotationA = world.getComponent(options.entityA, rotationId);
  const rotationB = world.getComponent(options.entityB, rotationId);

  if (rotationA === null || rotationB === null) {
    throw new Error(
      `Unable to add revolute joint to entity "${entity}": entityA and entityB must both have a RotationEcsComponent.`,
    );
  }

  const component: RevoluteJointEcsComponent = {
    ...merged,
    referenceAngle: rotationB.world - rotationA.world,
    accumulatedPointImpulse: vector2Zero(),
  };

  return world.addComponent(entity, revoluteJointId, component);
}
