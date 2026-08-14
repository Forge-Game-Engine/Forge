import { createComponentId } from '@forge-game-engine/forge/ecs';

/** Which of the entity's own `TextEcsComponent` fields a `PulsingTextEffectEcsComponent` drives. */
export type PulsingTextEffect = 'outlineWidth' | 'shadowSoftness';

/**
 * Demo-only component driving the outline/glow pulse examples: sweeps one
 * field of the entity's own `TextEcsComponent` (`outlineWidth` or
 * `shadowSoftness`) back and forth on a sine wave between `minValue` and
 * `maxValue`, via `createPulsingTextEffectEcsSystem`.
 */
export interface PulsingTextEffectEcsComponent {
  /** Which `TextEcsComponent` field this pulses. */
  effect: PulsingTextEffect;

  /** The low end of the sine wave. */
  minValue: number;

  /** The high end of the sine wave. */
  maxValue: number;

  /** How long one full pulse cycle takes, in seconds. */
  periodSeconds: number;

  /** Elapsed time since this entity started pulsing, in seconds. */
  elapsedSeconds: number;
}

export const pulsingTextEffectId =
  createComponentId<PulsingTextEffectEcsComponent>('pulsingTextEffect');
