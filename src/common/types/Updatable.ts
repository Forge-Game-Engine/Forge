/**
 * Represents an object that can be updated over time.
 */
export interface Updatable {
  /**
   * Updates the object with the given time.
   * @param deltaTime - The time between the last frame and the current one.
   */
  update: (deltaTime: number) => void;
}
