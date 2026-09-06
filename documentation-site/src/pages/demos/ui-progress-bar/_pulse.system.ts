import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  UiProgressBarEcsComponent,
  uiProgressBarId,
} from '@forge-game-engine/forge/ui';
import { PulseComponent, pulseId } from './_pulse.component';

/**
 * Creates a system that drives every `PulseComponent`'s paired
 * `UiProgressBarEcsComponent.value` through a triangle-wave oscillation
 * between `minValue` and `maxValue`, purely so this demo has a moving value
 * to show without needing any player interaction.
 * @param time - The time instance driving the oscillation.
 * @returns The pulse ECS system.
 */
export const createPulseEcsSystem = (
  time: Time,
): EcsSystem<[PulseComponent, UiProgressBarEcsComponent]> => ({
  name: 'pulse',
  query: [pulseId, uiProgressBarId],
  update: (_world, { components: [pulses, progressBars] }) => {
    for (let i = 0; i < pulses.length; i++) {
      const pulse = pulses[i];
      const progressBar = progressBars[i];
      const range = pulse.maxValue - pulse.minValue;

      // Triangle wave in [0, 1]: ramps up, then back down, forever.
      const phase = (time.timeInSeconds * pulse.speed) % 1;
      const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;

      progressBar.value = pulse.minValue + triangle * range;
    }
  },
});
