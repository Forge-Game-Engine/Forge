import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * ECS-style component interface for a position-based force connecting two
 * bodies' anchor points, pulling or pushing them towards `restLength` apart
 * along the line between them, per Hooke's Law (`F = -k * x`). Register
 * `createLinearSpringEcsSystem` to have the force applied to `bodyA`/`bodyB`
 * every tick while this component's entity exists. Used for vehicle
 * suspension (supporting weight and pushing a wheel back down after a
 * bump), rope-like tethers, and other soft connections; typically paired
 * with a {@link LinearDamperEcsComponent} sharing the same anchors to
 * dissipate the energy it stores.
 */
export interface LinearSpringEcsComponent {
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
   * The distance between the two anchors at which the spring exerts no
   * force.
   */
  restLength: number;

  /**
   * The spring constant (`k` in Hooke's Law `F = -k * x`), in N/m. Higher
   * values produce a stiffer spring that resists compression/extension away
   * from `restLength` more strongly.
   */
  stiffness: number;
}

export const LinearSpringId =
  createComponentId<LinearSpringEcsComponent>('LinearSpring');

/**
 * Options for {@link addLinearSpringComponent}.
 */
export interface LinearSpringOptions {
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

  /**
   * Defaults to the distance between the anchors at attach time, so a
   * spring attached between two bodies already positioned where you want
   * them to rest holds that distance without further tuning.
   */
  restLength?: number;

  stiffness: number;
}

const defaultLinearSpringOptions = {
  anchorA: Vector2.zero,
  anchorB: Vector2.zero,
};

/**
 * Attaches a {@link LinearSpringEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the spring. Neither `bodyA`,
 * `bodyB`, nor `stiffness` has a sensible default and all three must always
 * be provided.
 * @returns The attached component, for further tuning or runtime changes.
 * @throws An error if `stiffness` is negative.
 */
export function addLinearSpringComponent(
  world: EcsWorld,
  entity: number,
  options: LinearSpringOptions,
): LinearSpringEcsComponent {
  const { bodyA, bodyB, anchorA, anchorB, restLength, stiffness } = {
    ...defaultLinearSpringOptions,
    ...options,
  };

  if (stiffness < 0) {
    throw new Error(
      `Unable to add LinearSpringEcsComponent, "stiffness" (${stiffness}) must not be negative.`,
    );
  }

  const worldAnchorA = bodyA.position.add(anchorA.rotate(bodyA.angle));
  const worldAnchorB = bodyB.position.add(anchorB.rotate(bodyB.angle));

  const component: LinearSpringEcsComponent = {
    bodyA,
    bodyB,
    anchorA: anchorA.clone(),
    anchorB: anchorB.clone(),
    restLength: restLength ?? worldAnchorB.subtract(worldAnchorA).magnitude(),
    stiffness,
  };

  return world.addComponent(entity, LinearSpringId, component);
}
