import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * ECS-style component interface for a velocity-based force connecting two
 * bodies' anchor points, resisting the speed at which they move towards or
 * away from each other along the line between them, per `F = -c * v`.
 * Register `createLinearDamperEcsSystem` to have the force applied to
 * `bodyA`/`bodyB` every tick while this component's entity exists. Used
 * alongside a {@link LinearSpringEcsComponent} sharing the same anchors (a
 * shock absorber pairs with a suspension spring) to dissipate the energy the
 * spring stores and prevent endless bouncing.
 */
export interface LinearDamperEcsComponent {
  bodyA: RigidBody;

  bodyB: RigidBody;

  /**
   * The anchor point, relative to `bodyA`'s center of mass and unrotated by
   * `bodyA`'s angle (i.e. in `bodyA`'s local space).
   */
  anchorA: Vector2;

  /**
   * The anchor point, relative to `bodyB`'s center of mass and unrotated by
   * `bodyB`'s angle (i.e. in `bodyB`'s local space).
   */
  anchorB: Vector2;

  /**
   * The damping constant (`c` in `F = -c * v`), in N·s/m. Higher values
   * dissipate the anchors' relative compression/extension speed more
   * strongly.
   */
  dampingCoefficient: number;
}

export const LinearDamperId =
  createComponentId<LinearDamperEcsComponent>('LinearDamper');

/**
 * Options for {@link addLinearDamperComponent}.
 */
export interface LinearDamperOptions {
  bodyA: RigidBody;
  bodyB: RigidBody;

  /**
   * Defaults to each body's center of mass.
   */
  anchorA?: Vector2;

  /**
   * Defaults to each body's center of mass.
   */
  anchorB?: Vector2;

  dampingCoefficient: number;
}

const defaultLinearDamperOptions = {
  anchorA: Vector2.zero,
  anchorB: Vector2.zero,
};

/**
 * Attaches a {@link LinearDamperEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the damper. Neither `bodyA`,
 * `bodyB`, nor `dampingCoefficient` has a sensible default and all three
 * must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 * @throws An error if `dampingCoefficient` is negative.
 */
export function addLinearDamperComponent(
  world: EcsWorld,
  entity: number,
  options: LinearDamperOptions,
): LinearDamperEcsComponent {
  const { bodyA, bodyB, anchorA, anchorB, dampingCoefficient } = {
    ...defaultLinearDamperOptions,
    ...options,
  };

  if (dampingCoefficient < 0) {
    throw new Error(
      `Unable to add LinearDamperEcsComponent, "dampingCoefficient" (${dampingCoefficient}) must not be negative.`,
    );
  }

  const component: LinearDamperEcsComponent = {
    bodyA,
    bodyB,
    anchorA: anchorA.clone(),
    anchorB: anchorB.clone(),
    dampingCoefficient,
  };

  return world.addComponent(entity, LinearDamperId, component);
}
