import { ParticleEmitter } from './particle-emitter.js';

import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for the particle emitter.
 */
export interface ParticleEmitterEcsComponent {
  emitters: Map<string, ParticleEmitter>;
}

export const ParticleEmitterId =
  createComponentId<ParticleEmitterEcsComponent>('ParticleEmitter');
