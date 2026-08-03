import { positionId, rotationId } from '../../common/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';

/**
 * Fields of {@link LinearSpringEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface LinearSpringDefaultedOptions {
  /** Anchor point, in `entityA`'s local space. */
  localAnchorA: Vector2;
  /** Anchor point, in `entityB`'s local space. */
  localAnchorB: Vector2;
  /**
   * The distance between the two anchors at which the spring applies no
   * force. Defaults to the distance between the anchors at the moment the
   * spring is added.
   */
  restLength: number;
}

export interface LinearSpringRequiredOptions {
  entityA: number;
  entityB: number;
  /** The spring's stiffness (Hooke's law constant), in newtons/unit. */
  stiffness: number;
}

/**
 * ECS-style component interface for a Hooke's-law linear spring pulling (or
 * pushing) two entities' anchor points toward `restLength` apart. A pure
 * force generator, not a hard constraint - pair with a joint (e.g. a
 * `PrismaticJointEcsComponent`) if the anchors must also be geometrically
 * constrained. An entity referenced by `entityA`/`entityB` with no
 * `RigidBodyEcsComponent` is treated as static.
 */
export interface LinearSpringEcsComponent
  extends LinearSpringRequiredOptions, LinearSpringDefaultedOptions {}

export const linearSpringId =
  createComponentId<LinearSpringEcsComponent>('linear-spring');

/**
 * Attaches a {@link LinearSpringEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The (dedicated) entity to attach the spring component to.
 * @param options - Options for configuring the spring.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addLinearSpringComponent(
  world: EcsWorld,
  entity: number,
  options: LinearSpringRequiredOptions & Partial<LinearSpringDefaultedOptions>,
): LinearSpringEcsComponent {
  if (options.stiffness < 0) {
    throw new Error(
      `Unable to add linear spring to entity "${entity}": stiffness must be >= 0.`,
    );
  }

  const restLength =
    options.restLength ?? computeAnchorDistance(world, options);

  const component: LinearSpringEcsComponent = {
    localAnchorA: Vector2.zero,
    localAnchorB: Vector2.zero,
    ...options,
    restLength,
  };

  return world.addComponent(entity, linearSpringId, component);
}

function computeAnchorDistance(
  world: EcsWorld,
  options: LinearSpringRequiredOptions & Partial<LinearSpringDefaultedOptions>,
): number {
  const positionA = world.getComponent(options.entityA, positionId);
  const rotationA = world.getComponent(options.entityA, rotationId);
  const positionB = world.getComponent(options.entityB, positionId);
  const rotationB = world.getComponent(options.entityB, rotationId);

  if (
    positionA === null ||
    rotationA === null ||
    positionB === null ||
    rotationB === null
  ) {
    throw new Error(
      'Unable to add linear spring: entityA and entityB must both have Position and Rotation components when restLength is omitted.',
    );
  }

  const localAnchorA = options.localAnchorA ?? Vector2.zero;
  const localAnchorB = options.localAnchorB ?? Vector2.zero;

  const worldAnchorA = positionA.world.add(
    localAnchorA.rotate(rotationA.world),
  );
  const worldAnchorB = positionB.world.add(
    localAnchorB.rotate(rotationB.world),
  );

  return worldAnchorB.subtract(worldAnchorA).magnitude();
}
