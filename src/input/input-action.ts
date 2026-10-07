/**
 * Represents a generic input action with a name and input group.
 */
export interface InputAction {
  /** The name of the action. */
  readonly name: string;
  /** The input group this action belongs to. */
  readonly inputGroup: string;
}
