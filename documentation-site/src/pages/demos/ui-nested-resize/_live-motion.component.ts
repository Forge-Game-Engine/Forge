import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * Demo-only component driving the outer panel's live motion: sweeps its own
 * `RectTransformEcsComponent`'s own size (`x`/`y`) *and* `anchoredPosition` back and
 * forth every frame (an independent sine wave per axis - four axes total,
 * each on its own period, so the panel neither pulses symmetrically nor
 * moves in a simple loop) - see `createLiveMotionEcsSystem`. Every nested
 * child below it reacts to the change purely through its own anchor, with
 * no code here aware that any child exists.
 */
export interface LiveMotionEcsComponent {
  minWidth: number;
  maxWidth: number;
  widthPeriodSeconds: number;

  minHeight: number;
  maxHeight: number;
  heightPeriodSeconds: number;

  minX: number;
  maxX: number;
  xPeriodSeconds: number;

  minY: number;
  maxY: number;
  yPeriodSeconds: number;

  elapsedSeconds: number;
}

export const liveMotionId =
  createComponentId<LiveMotionEcsComponent>('liveMotion');
