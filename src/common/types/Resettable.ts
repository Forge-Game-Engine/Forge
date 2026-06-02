/**
 * An interface for objects that can be reset to their initial state.
 */
export interface Resettable {
  /** Resets the object to its initial state. */
  reset(): void;
}
