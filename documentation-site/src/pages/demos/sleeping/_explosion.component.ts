import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/** Where a click's explosion is aimed from, and how strong it is. */
export interface ExplosionEcsComponent {
  /** The camera the click's position is converted to world space through. */
  camera: number;

  /** The impulse at the explosion's center. */
  force: number;

  /** How far the explosion reaches, in world units. */
  radius: number;
}

export const explosionId =
  createComponentId<ExplosionEcsComponent>('explosion');

/**
 * Attaches an {@link ExplosionEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param explosion - The explosion's camera, force and radius.
 * @returns The attached component.
 */
export function addExplosionComponent(
  world: EcsWorld,
  entity: number,
  explosion: ExplosionEcsComponent,
): ExplosionEcsComponent {
  return world.addComponent(entity, explosionId, explosion);
}
