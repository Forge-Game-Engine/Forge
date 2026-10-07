import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { MaskEcsComponent, maskId } from '@forge-game-engine/forge/rendering';
import { MaskPulseComponent, maskPulseId } from './_mask-pulse.component';

/**
 * Creates a system that writes a triangle wave into the `amount` of every
 * pulsing entity's linear or radial mask.
 * @param time - The time the wave follows.
 * @returns The mask pulse ECS system.
 */
export const createMaskPulseEcsSystem = (
  time: Time,
): EcsSystem<[MaskPulseComponent, MaskEcsComponent]> => ({
  name: 'maskPulse',
  query: [maskPulseId, maskId],
  update: (_world, { components: [pulses, masks] }) => {
    for (let i = 0; i < pulses.length; i++) {
      const { shape } = masks[i];

      if (shape.kind === 'rect') {
        continue;
      }

      const phase = (time.timeInSeconds * pulses[i].speed) % 1;

      shape.amount = phase < 0.5 ? phase * 2 : 2 - phase * 2;
    }
  },
});
