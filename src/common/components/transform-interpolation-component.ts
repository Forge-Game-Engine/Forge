import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { copyLocalTransformInto } from '../transforms/local-transform-snapshot.js';

/**
 * A copy of an entity's local position, rotation and scale.
 */
export interface LocalTransformSnapshot {
  /** `position.local`, or `(0, 0)` when the entity has no position. */
  readonly position: Vector2;

  /** `rotation.local`, or `0` when the entity has no rotation. */
  rotation: number;

  /** `scale.local`, or `(1, 1)` when the entity has no scale. */
  readonly scale: Vector2;
}

/**
 * Draws an entity that moves in fixed steps smoothly on every frame: the
 * transform system's once-per-frame pass composes its `world` transform from
 * a blend of its local transform at the start and end of the latest fixed
 * step, by `time.fixedOverstepFraction`, instead of from `local`. The entity
 * is drawn up to one fixed step behind where the simulation has it.
 * `addRigidBodyComponent` adds it to every rigid body.
 *
 * Only an entity whose `local` still equals `stepEnd` is blended. When
 * something other than the fixed steps moved it since the latest step (a
 * teleport, a per-frame mover), it's drawn at `local` until the next step.
 *
 * Both snapshots are output: `createTransformEcsSystem` writes `stepStart` at
 * the start of each fixed step, and `createTransformInterpolationEcsSystem`
 * writes `stepEnd` at the end of each. Remove the component to draw the
 * entity at `local`.
 */
export interface TransformInterpolationEcsComponent {
  /**
   * The entity's local transform at the start of the latest fixed step.
   * Output, written only by `createTransformEcsSystem` inside a fixed step.
   */
  readonly stepStart: LocalTransformSnapshot;

  /**
   * The entity's local transform at the end of the latest fixed step.
   * Output, written only by `createTransformInterpolationEcsSystem`.
   */
  readonly stepEnd: LocalTransformSnapshot;
}

export const transformInterpolationId =
  createComponentId<TransformInterpolationEcsComponent>(
    'transformInterpolation',
  );

function createSnapshot(
  world: EcsWorld,
  entity: number,
): LocalTransformSnapshot {
  const snapshot = { position: Vec2.zero, rotation: 0, scale: Vec2.one };

  copyLocalTransformInto(world, entity, snapshot);

  return snapshot;
}

/**
 * Attaches a {@link TransformInterpolationEcsComponent} to `entity`, with
 * both snapshots copied from its current local transform, so it's drawn at
 * `local` until its first fixed step. Its position, rotation and scale are
 * optional: the snapshots hold the identity values for the ones it doesn't
 * have yet.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @returns The attached component.
 */
export function addTransformInterpolationComponent(
  world: EcsWorld,
  entity: number,
): TransformInterpolationEcsComponent {
  return world.addComponent(entity, transformInterpolationId, {
    stepStart: createSnapshot(world, entity),
    stepEnd: createSnapshot(world, entity),
  });
}
