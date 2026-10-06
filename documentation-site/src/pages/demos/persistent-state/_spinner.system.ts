import {
  RotationEcsComponent,
  rotationId,
  ScaleEcsComponent,
  scaleId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { SpinnerEcsComponent, spinnerId } from './_spinner.component';

/**
 * Sizes the square from its settings and turns it while `spin` is on.
 */
export const createSpinnerEcsSystem = (
  time: Time,
): EcsSystem<
  [SpinnerEcsComponent, ScaleEcsComponent, RotationEcsComponent]
> => ({
  name: 'spinner',
  query: [spinnerId, scaleId, rotationId],
  update: (_world, { components: [spinners, scales, rotations] }) => {
    for (let i = 0; i < spinners.length; i++) {
      const { size, spin, speed } = spinners[i];

      scales[i].local.x = size;
      scales[i].local.y = size;

      if (spin) {
        rotations[i].local += speed * time.deltaTimeInSeconds;
      }
    }
  },
});
