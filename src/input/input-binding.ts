import { InputAction } from './input-action';

/** Represents a binding between an input and an action. */
export interface InputBinding<TAction extends InputAction> {
  /** The action associated with this binding. */
  action: TAction;
  /** A human-readable description of this binding. */
  displayText: string;
}
