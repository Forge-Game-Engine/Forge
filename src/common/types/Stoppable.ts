/**
 * An object that can be stopped, such as a `Game` or an `EcsWorld`.
 */
export interface Stoppable {
  /** Stops the object. */
  stop(): void;
}
