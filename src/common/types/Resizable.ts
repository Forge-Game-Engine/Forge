/**
 * Represents an object with a resizable surface, such as a `RenderContext`'s
 * canvas.
 */
export interface Resizable {
  /**
   * The current width, in pixels.
   */
  width: number;

  /**
   * The current height, in pixels.
   */
  height: number;

  /**
   * Resizes the object.
   * @param width - The new width, in pixels.
   * @param height - The new height, in pixels.
   */
  resize(width: number, height: number): void;
}
