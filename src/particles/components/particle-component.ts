import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for a particle.
 */
export interface ParticleEcsComponent {
  rotationSpeed: number;
}

export const ParticleId = createComponentId<ParticleEcsComponent>('Particle');
