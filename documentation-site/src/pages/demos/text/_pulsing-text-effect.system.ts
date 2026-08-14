import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TextEcsComponent, textId } from '@forge-game-engine/forge/text';
import {
  PulsingTextEffectEcsComponent,
  pulsingTextEffectId,
} from './_pulsing-text-effect.component';

/**
 * Sweeps every `PulsingTextEffectEcsComponent` entity's own
 * `outlineWidth`/`shadowSoftness` back and forth (a sine wave between
 * `minValue` and `maxValue`) every frame - this is what demonstrates that
 * `outlineWidth`/`shadowSoftness` are ordinary, per-frame-writable
 * `TextEcsComponent` fields like any other, not shape-relevant properties
 * requiring a re-shape to take effect.
 * @param time - The time instance used to derive elapsed seconds.
 * @returns The pulsing text effect ECS system.
 */
export const createPulsingTextEffectEcsSystem = (
  time: Time,
): EcsSystem<[PulsingTextEffectEcsComponent, TextEcsComponent]> => ({
  query: [pulsingTextEffectId, textId],
  update: (_world, { components: [pulses, texts] }) => {
    for (let i = 0; i < pulses.length; i++) {
      const pulse = pulses[i];
      const textComponent = texts[i];

      pulse.elapsedSeconds += time.deltaTimeInSeconds;

      const angle = (pulse.elapsedSeconds / pulse.periodSeconds) * Math.PI * 2;
      const midpoint = (pulse.minValue + pulse.maxValue) / 2;
      const amplitude = (pulse.maxValue - pulse.minValue) / 2;
      const currentValue = midpoint + amplitude * Math.sin(angle);

      if (pulse.effect === 'outlineWidth') {
        textComponent.outlineWidth = currentValue;
      } else {
        textComponent.shadowSoftness = currentValue;
      }
    }
  },
});
