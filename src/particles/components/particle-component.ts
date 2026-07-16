import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for a particle.
 */
export interface ParticleEcsComponent {
  rotationSpeed: number;
}

export const ParticleId = createComponentId<ParticleEcsComponent>('Particle');

const defaultParticleOptions: ParticleEcsComponent = {
  rotationSpeed: 0,
};

/**
 * Attaches a {@link ParticleEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the particle.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addParticleComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<ParticleEcsComponent> = {},
): ParticleEcsComponent {
  const component: ParticleEcsComponent = {
    ...defaultParticleOptions,
    ...options,
  };

  return world.addComponent(entity, ParticleId, component);
}
