import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * Demo-only component driving `_pulse.system.ts`: oscillates a
 * `UiProgressBarEcsComponent.value` between `minValue` and `maxValue` over
 * time, so the progress bar demo has something to show without needing any
 * player interaction.
 */
export interface PulseComponent {
  minValue: number;
  maxValue: number;
  /** Full empty-to-full-to-empty cycles per second. */
  speed: number;
}

export const pulseId = createComponentId<PulseComponent>('pulse');
