import { clamp } from '../math/index.js';

/**
 * The `Color` class represents a color that can be created using RGB(A) or HSL(A).
 *
 * Red, green and blue have no upper bound: a value above `1` is brighter
 * than white. Used as a tint, it brightens a sprite past its texture. On an
 * 8-bit render target or the canvas, each channel of the result is clamped
 * to full brightness when it's written. On an HDR render target
 * (`RENDER_TARGET_FORMAT.hdr`) the value survives to bloom and tone mapping.
 */
export class Color {
  private readonly _r: number;
  private readonly _g: number;
  private readonly _b: number;
  private readonly _a: number;

  /** White color constant rgba(1, 1, 1, 1) */
  public static readonly white: Color = new Color(1, 1, 1, 1);
  /** Black color constant rgba(0, 0, 0, 1) */
  public static readonly black: Color = new Color(0, 0, 0, 1);
  /** Red color constant rgba(1, 0, 0, 1) */
  public static readonly red: Color = new Color(1, 0, 0, 1);
  /** Green color constant rgba(0, 1, 0, 1) */
  public static readonly green: Color = new Color(0, 1, 0, 1);
  /** Blue color constant rgba(0, 0, 1, 1) */
  public static readonly blue: Color = new Color(0, 0, 1, 1);
  /** Transparent color constant rgba(0, 0, 0, 0) */
  public static readonly transparent: Color = new Color(0, 0, 0, 0);

  /**
   * Constructs a new `Color` instance using RGBA values.
   * @param r - The red component. `1` is full brightness; higher values are
   * brighter than white. Negative values are clamped to `0`.
   * @param g - The green component. `1` is full brightness; higher values
   * are brighter than white. Negative values are clamped to `0`.
   * @param b - The blue component. `1` is full brightness; higher values are
   * brighter than white. Negative values are clamped to `0`.
   * @param a - The alpha component (0-1), clamped to that range. Defaults to
   * 1 (fully opaque).
   */
  constructor(r: number, g: number, b: number, a: number = 1) {
    // Negative light has no meaning, and alpha outside [0, 1] would turn the
    // premultiplied blend factors negative on a float render target.
    this._r = Math.max(r, 0);
    this._g = Math.max(g, 0);
    this._b = Math.max(b, 0);
    this._a = clamp(a, 0, 1);
  }

  /**
   * Creates a `Color` instance using HSLA values.
   * @param h - The hue (0-360).
   * @param s - The saturation (0-100).
   * @param l - The lightness (0-100).
   * @param a - The alpha component (0-1). Defaults to 1 (fully opaque).
   * @returns A new `Color` instance.
   * @throws An error if `s` or `l` is outside 0-100.
   */
  public static fromHSLA(
    h: number,
    s: number,
    l: number,
    a: number = 1,
  ): Color {
    if (s < 0 || s > 100 || l < 0 || l > 100) {
      throw new Error(
        `Unable to create a color from HSLA(${h}, ${s}, ${l}, ${a}): saturation and lightness must be between 0 and 100.`,
      );
    }

    const normalizedH = h / 360;
    const normalizedS = s / 100;
    const normalizedL = l / 100;

    let r: number, g: number, b: number;

    if (normalizedS === 0) {
      r = g = b = normalizedL; // Achromatic
    } else {
      const q =
        normalizedL < 0.5
          ? normalizedL * (1 + normalizedS)
          : normalizedL + normalizedS - normalizedL * normalizedS;
      const p = 2 * normalizedL - q;

      r = Color._hueToRGB(p, q, normalizedH + 1 / 3);
      g = Color._hueToRGB(p, q, normalizedH);
      b = Color._hueToRGB(p, q, normalizedH - 1 / 3);
    }

    return new Color(r, g, b, a);
  }

  private static _hueToRGB(p: number, q: number, t: number): number {
    const wrappedTValue = ((t % 1) + 1) % 1;

    if (wrappedTValue < 1 / 6) {
      return p + (q - p) * 6 * wrappedTValue;
    }

    if (wrappedTValue < 1 / 2) {
      return q;
    }

    if (wrappedTValue < 2 / 3) {
      return p + (q - p) * (2 / 3 - wrappedTValue) * 6;
    }

    return p;
  }

  /**
   * Gets the red component of the color.
   */
  get r(): number {
    return this._r;
  }

  /**
   * Gets the green component of the color.
   */
  get g(): number {
    return this._g;
  }

  /**
   * Gets the blue component of the color.
   */
  get b(): number {
    return this._b;
  }

  /**
   * Gets the alpha component of the color.
   */
  get a(): number {
    return this._a;
  }

  /**
   * Converts the color to a CSS-compatible RGBA string. CSS colors can't be
   * brighter than white, so channels above `1` are written as `255`.
   * @returns The RGBA string (e.g., `rgba(255, 0, 0, 1)`).
   */
  public toRGBAString(): string {
    const toByte = (channel: number): number =>
      Math.min(Math.round(channel * 255), 255);

    return `rgba(${toByte(this._r)}, ${toByte(this._g)}, ${toByte(this._b)}, ${this._a})`;
  }

  /**
   * Converts the color to a glsl-compatible float32 array.
   * @returns The RGBA array (e.g. `[1, 0, 0, 1]` for red).
   */
  public toFloat32Array(): Float32Array {
    return new Float32Array([this._r, this._g, this._b, this._a]);
  }
}
