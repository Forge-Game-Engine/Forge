import { ParticleEmitter } from './particle-emitter.js';

import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for the particle emitter.
 */
export interface ParticleEmitterEcsComponent {
  emitters: Map<string, ParticleEmitter>;
}

export const ParticleEmitterId =
  createComponentId<ParticleEmitterEcsComponent>('ParticleEmitter');

/**
 * Attaches a {@link ParticleEmitterEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the particle emitter.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addParticleEmitterComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<ParticleEmitterEcsComponent> = {},
): ParticleEmitterEcsComponent {
  // `emitters` defaults to a fresh Map per call (rather than a shared
  // module-level default) since it's mutated in place by callers.
  const defaultParticleEmitterOptions: ParticleEmitterEcsComponent = {
    emitters: new Map(),
  };

  const component: ParticleEmitterEcsComponent = {
    ...defaultParticleEmitterOptions,
    ...options,
  };

  return world.addComponent(entity, ParticleEmitterId, component);
}
