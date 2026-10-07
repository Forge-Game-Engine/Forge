import { TriggerAction } from './actions/index.js';
import { ButtonMoment } from './constants/index.js';
import { InputBinding } from './input-binding.js';

/**
 * A binding that fires a `TriggerAction` when its button goes down or comes
 * up. The keyboard, mouse and gamepad trigger bindings all have this shape.
 */
export interface TriggerInputBinding extends InputBinding<TriggerAction> {
  /** Whether the binding fires when its button goes down or comes up. */
  readonly moment: ButtonMoment;
}
