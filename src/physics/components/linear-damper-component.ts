import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { formatEntity } from '../../ecs/entity.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * Fields of {@link LinearDamperEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface LinearDamperDefaultedOptions {
  /** Anchor point, in `entityA`'s local space. Defaults to its origin. */
  localAnchorA: Vector2;
  /** Anchor point, in `entityB`'s local space. Defaults to its origin. */
  localAnchorB: Vector2;
}

export interface LinearDamperRequiredOptions {
  /** The first connected entity. */
  entityA: number;
  /** The second connected entity. */
  entityB: number;
  /** The damper's coefficient, in newton-seconds/unit. */
  dampingCoefficient: number;
}

/**
 * ECS-style component interface for a linear damper, opposing the closing
 * velocity between two entities' anchor points along the line connecting
 * them. A pure force generator, not a hard constraint - typically paired
 * with a `LinearSpringEcsComponent` sharing the same anchors. An entity
 * referenced by `entityA`/`entityB` with no `RigidBodyEcsComponent` is
 * treated as static.
 */
export interface LinearDamperEcsComponent
  extends LinearDamperRequiredOptions, LinearDamperDefaultedOptions {}

export const linearDamperId =
  createComponentId<LinearDamperEcsComponent>('linear-damper');

/**
 * Attaches a {@link LinearDamperEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The (dedicated) entity to attach the damper component to.
 * @param options - Options for configuring the damper.
 * @returns The attached component, for further tuning or runtime changes.
 * @throws An error if `dampingCoefficient` is negative.
 */
export function addLinearDamperComponent(
  world: EcsWorld,
  entity: number,
  options: LinearDamperRequiredOptions & Partial<LinearDamperDefaultedOptions>,
): LinearDamperEcsComponent {
  if (options.dampingCoefficient < 0) {
    throw new Error(
      `Unable to add linear damper to entity ${formatEntity(entity)}: dampingCoefficient must be >= 0.`,
    );
  }

  const defaultOptions: LinearDamperDefaultedOptions = {
    localAnchorA: Vec2.zero,
    localAnchorB: Vec2.zero,
  };

  const component: LinearDamperEcsComponent = withDefaults(
    defaultOptions,
    options,
  );

  return world.addComponent(entity, linearDamperId, component);
}
