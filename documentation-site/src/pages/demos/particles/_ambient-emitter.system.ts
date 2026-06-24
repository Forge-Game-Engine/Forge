import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ParticleEmitterEcsComponent,
  ParticleEmitterId,
} from '@forge-game-engine/forge/particles';
import { ambientEmitterId } from './_ambient-emitter.component';

/**
 * Keeps every emitter on an entity tagged `ambientEmitterId` running forever,
 * re-triggering each one as soon as its current emission finishes. Unlike
 * the cursor's spark and smoke emitters, which only emit when the player
 * clicks or drags, the ember fountain has no input to react to, so it drives
 * itself.
 */
export const createAmbientEmitterEcsSystem = (): EcsSystem<
  [ParticleEmitterEcsComponent]
> => ({
  query: [ParticleEmitterId],
  tags: [ambientEmitterId],
  run: (result) => {
    const [particleEmitterComponent] = result.components;

    for (const emitter of particleEmitterComponent.emitters.values()) {
      emitter.emitIfNotEmitting();
    }
  },
});
