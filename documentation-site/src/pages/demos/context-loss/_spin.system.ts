import {
  RotationEcsComponent,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';
import { createComponentId, EcsSystem } from '@forge-game-engine/forge/ecs';

/** Turns an entity at a constant rate, in radians per second. */
export interface SpinEcsComponent {
  radiansPerSecond: number;
}

export const spinId = createComponentId<SpinEcsComponent>('spin');

/**
 * Turns every spinning entity. It keeps running while the WebGL context is
 * lost, so the planet has moved on when the context comes back.
 */
export const createSpinEcsSystem = (
  time: Time,
): EcsSystem<[SpinEcsComponent, RotationEcsComponent]> => ({
  query: [spinId, rotationId],
  update: (_world, { components: [spins, rotations] }) => {
    for (let i = 0; i < spins.length; i++) {
      rotations[i].local += spins[i].radiansPerSecond * time.deltaTimeInSeconds;
    }
  },
});
