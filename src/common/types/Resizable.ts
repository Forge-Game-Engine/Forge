/**
 * Represents an object with a resizable surface, such as a `RenderContext`'s
 * canvas.
 */
export interface Resizable {
  /**
   * The current width of the surface's own pixel grid (for a
   * `RenderContext`, its drawing buffer, in device pixels).
   */
  width: number;

  /**
   * The current height of the surface's own pixel grid (for a
   * `RenderContext`, its drawing buffer, in device pixels).
   */
  height: number;

  /**
   * Resizes the object to fit an on-page area of `width` x `height` CSS
   * pixels, on a display with `devicePixelRatio` device pixels per CSS
   * pixel. Called again whenever either changes, and may be called with an
   * unchanged size, so implementations should treat a call that doesn't
   * change anything as a no-op.
   * @param width - The new width, in CSS pixels.
   * @param height - The new height, in CSS pixels.
   * @param devicePixelRatio - The display's current device pixels per CSS pixel.
   */
  resize(width: number, height: number, devicePixelRatio: number): void;
}
