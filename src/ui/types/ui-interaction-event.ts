import { Vector2 } from '../../math/index.js';

/**
 * Payload carried by all interaction events emitted from
 * {@link UiStateEcsComponent}. Every event — hover, press, focus, etc. —
 * uses this same shape so listeners have a uniform API.
 */
export interface UiInteractionEvent {
  /** The entity that received the interaction. */
  entity: number;
  /** Current pointer position in UI screen-space (CSS pixels, top-left origin). */
  pointer: Vector2;
  /** Whether the interaction was initiated by pointer or keyboard. */
  source: 'pointer' | 'keyboard';
}
