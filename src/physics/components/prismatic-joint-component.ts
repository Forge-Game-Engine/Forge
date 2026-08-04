import { rotationId } from '../../common/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';

/**
 * Fields of {@link PrismaticJointEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface PrismaticJointDefaultedOptions {
  /** Anchor point, in `entityA`'s local space, `entityB`'s anchor slides relative to. */
  localAnchorA: Vector2;
  /** Anchor point, in `entityB`'s local space, that slides along the axis. */
  localAnchorB: Vector2;
  /** The axis `entityB`'s anchor is free to slide along, in `entityA`'s local space. Normalized on add. */
  axis: Vector2;

  /** Whether the translation along `axis` is clamped to `[lowerTranslation, upperTranslation]`. */
  enableLimit: boolean;
  /** The lowest translation along `axis` allowed when `enableLimit` is `true`. */
  lowerTranslation: number;
  /** The highest translation along `axis` allowed when `enableLimit` is `true`. */
  upperTranslation: number;

  /** The soft constraint's target frequency, in Hz, correcting perpendicular/angular drift. */
  hertz: number;
  /** The soft constraint's damping ratio correcting perpendicular/angular drift. */
  dampingRatio: number;
}

export interface PrismaticJointRequiredOptions {
  entityA: number;
  entityB: number;
}

/**
 * ECS-style component interface for a prismatic (slider) joint, constraining
 * `entityB` to slide relative to `entityA` only along `axis`, with `entityB`'s
 * rotation locked relative to `entityA`'s. An entity referenced by
 * `entityA`/`entityB` with no `RigidBodyEcsComponent` is treated as static.
 */
export interface PrismaticJointEcsComponent
  extends PrismaticJointRequiredOptions, PrismaticJointDefaultedOptions {
  /** `entityB`'s rotation minus `entityA`'s rotation at the moment the joint was created; the locked relative rotation. */
  readonly referenceAngle: number;

  /** Warm-start state: the accumulated impulse of the perpendicular-translation constraint. */
  accumulatedPerpImpulse: number;
  /** Warm-start state: the accumulated impulse of the angular-lock constraint. */
  accumulatedAngularImpulse: number;
  /** Warm-start state: the accumulated impulse of the translation-limit constraint. */
  accumulatedLimitImpulse: number;
}

export const prismaticJointId =
  createComponentId<PrismaticJointEcsComponent>('prismatic-joint');

/**
 * Attaches a {@link PrismaticJointEcsComponent} to `entity`, constraining
 * `options.entityB` to slide relative to `options.entityA` along `axis`.
 * `entity` is a dedicated joint entity, not `entityA` or `entityB`
 * themselves. `entityA`/`entityB` must already have a `RotationEcsComponent`
 * (used to compute `referenceAngle`).
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The (dedicated) entity to attach the joint component to.
 * @param options - Options for configuring the joint.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addPrismaticJointComponent(
  world: EcsWorld,
  entity: number,
  options: PrismaticJointRequiredOptions &
    Partial<PrismaticJointDefaultedOptions>,
): PrismaticJointEcsComponent {
  const defaultOptions: PrismaticJointDefaultedOptions = {
    localAnchorA: Vec2.zero,
    localAnchorB: Vec2.zero,
    axis: Vec2.right,
    enableLimit: false,
    lowerTranslation: 0,
    upperTranslation: 0,
    hertz: 60,
    dampingRatio: 2,
  };

  const merged = { ...defaultOptions, ...options };

  if (Vec2.magnitudeSquared(merged.axis) === 0) {
    throw new Error(
      `Unable to add prismatic joint to entity "${entity}": axis must not be the zero vector.`,
    );
  }

  if (merged.lowerTranslation > merged.upperTranslation) {
    throw new Error(
      `Unable to add prismatic joint to entity "${entity}": lowerTranslation (${merged.lowerTranslation}) must be <= upperTranslation (${merged.upperTranslation}).`,
    );
  }

  const rotationA = world.getComponent(options.entityA, rotationId);
  const rotationB = world.getComponent(options.entityB, rotationId);

  if (rotationA === null || rotationB === null) {
    throw new Error(
      `Unable to add prismatic joint to entity "${entity}": entityA and entityB must both have a RotationEcsComponent.`,
    );
  }

  const component: PrismaticJointEcsComponent = {
    ...merged,
    // Clone before normalizing: `merged.axis` may be `options.axis`, the
    // caller's own vector object, which must not be mutated as a side effect.
    axis: Vec2.normalize(Vec2.clone(merged.axis)),
    referenceAngle: rotationB.world - rotationA.world,
    accumulatedPerpImpulse: 0,
    accumulatedAngularImpulse: 0,
    accumulatedLimitImpulse: 0,
  };

  return world.addComponent(entity, prismaticJointId, component);
}
