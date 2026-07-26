/**
 * A landmark sprite's on-screen bounding box, as measured from the actual
 * rendered canvas bitmap (not from ECS state).
 */
export interface PixelBounds {
  /** The leftmost on-screen x pixel where a matching pixel was found. */
  left: number;
  /** The rightmost on-screen x pixel where a matching pixel was found. */
  right: number;
  /** The topmost on-screen y pixel where a matching pixel was found. */
  top: number;
  /** The bottommost on-screen y pixel where a matching pixel was found. */
  bottom: number;
}

/**
 * Accumulates a bounding box over a stream of matched (x, y) pixel
 * coordinates, pulled out of `scanPixelBounds` to keep that function's
 * cognitive complexity down.
 */
class PixelBoundsAccumulator {
  private _left = -1;
  private _right = -1;
  private _top = -1;
  private _bottom = -1;

  public include(x: number, y: number): void {
    this._left = this._left === -1 ? x : Math.min(this._left, x);
    this._right = Math.max(this._right, x);
    this._top = this._top === -1 ? y : Math.min(this._top, y);
    this._bottom = Math.max(this._bottom, y);
  }

  public toBounds(): PixelBounds | null {
    if (this._left === -1) {
      return null;
    }

    return {
      left: this._left,
      right: this._right,
      top: this._top,
      bottom: this._bottom,
    };
  }
}

/**
 * Scans the *actual displayed bitmap* of `canvas` (via a `drawImage`/
 * `getImageData` readback - see AGENTS.md's "Be wary of pixel-level
 * rendering assertions") for pixels matching `isMatch`, and returns their
 * combined bounding box. Returns `null` if no matching pixel is found. This
 * generalizes `camera-pan-zoom.ts`'s `measureGreenSquareBounds` to scan the
 * full canvas (not just one horizontal line) and to accept an arbitrary
 * color predicate, since the input scenes need to locate landmarks that can
 * move both horizontally and vertically. Must be called in the same
 * `page.evaluate` task as the `step()` call that precedes it, for the same
 * reason documented there: the canvas isn't created with
 * `preserveDrawingBuffer`, so a browser may clear it as soon as control
 * returns to Playwright after a frame is presented.
 * @param canvas - The canvas to read pixels back from.
 * @param isMatch - Called with each pixel's 0-255 RGB components.
 * @returns The matching pixels' bounding box, or `null` if none matched.
 */
export function scanPixelBounds(
  canvas: HTMLCanvasElement,
  isMatch: (r: number, g: number, b: number) => boolean,
): PixelBounds | null {
  const sampleCanvas = document.createElement('canvas');

  sampleCanvas.width = canvas.width;
  sampleCanvas.height = canvas.height;

  const context2d = sampleCanvas.getContext('2d');

  if (!context2d) {
    throw new Error('2D canvas context not available');
  }

  context2d.drawImage(canvas, 0, 0);

  const { data } = context2d.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = new PixelBoundsAccumulator();

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const offset = (y * canvas.width + x) * 4;

      if (isMatch(data[offset], data[offset + 1], data[offset + 2])) {
        bounds.include(x, y);
      }
    }
  }

  return bounds.toBounds();
}

/**
 * Generous per-channel tolerance for matching a tint color against a
 * rendered pixel: pixel quantization and antialiased edges mean an exact
 * byte match isn't realistic, and this only needs to distinguish between a
 * handful of maximally-distinct tint colors (see `input-scene-colors.ts`),
 * not match an exact value.
 */
const colorMatchTolerance = 40;

/**
 * Builds a pixel-match predicate (for `scanPixelBounds`) that matches a
 * given 0-255 RGB target color within `colorMatchTolerance`.
 * @param target - The target color's 0-255 RGB components.
 * @returns A predicate suitable for `scanPixelBounds`.
 */
export function matchesColor(target: {
  r: number;
  g: number;
  b: number;
}): (r: number, g: number, b: number) => boolean {
  return (r: number, g: number, b: number): boolean =>
    Math.abs(r - target.r) < colorMatchTolerance &&
    Math.abs(g - target.g) < colorMatchTolerance &&
    Math.abs(b - target.b) < colorMatchTolerance;
}
