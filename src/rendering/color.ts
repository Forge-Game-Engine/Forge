import { clamp } from '../math';

/**
 * The `Color` class represents a color that can be created using RGB(A) or HSL(A).
 */
export class Color {
  /**
   * Creates a `Color` instance using HSLA values.
   * @param h - The hue (0-360).
   * @param s - The saturation (0-100).
   * @param l - The lightness (0-100).
   * @param a - The alpha component (0-1). Defaults to 1 (fully opaque).
   * @returns A new `Color` instance.
   */
  public static fromHSLA(
    h: number,
    s: number,
    l: number,
    a: number = 1,
  ): Color {
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

    return new Color(
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
      a,
    );
  }

  private static _hueToRGB(p: number, q: number, t: number): number {
    if (t < 0) {
      t += 1;
    }

    if (t > 1) {
      t -= 1;
    }

    if (t < 1 / 6) {
      return p + (q - p) * 6 * t;
    }

    if (t < 1 / 2) {
      return q;
    }

    if (t < 2 / 3) {
      return p + (q - p) * (2 / 3 - t) * 6;
    }

    return p;
  }

  private readonly _r: number;
  private readonly _g: number;
  private readonly _b: number;
  private readonly _a: number;

  /**
   * Constructs a new `Color` instance using RGBA values.
   * @param r - The red component (0-255).
   * @param g - The green component (0-255).
   * @param b - The blue component (0-255).
   * @param a - The alpha component (0-1). Defaults to 1 (fully opaque).
   */
  constructor(r: number, g: number, b: number, a: number = 1) {
    this._r = clamp(r, 0, 255);
    this._g = clamp(g, 0, 255);
    this._b = clamp(b, 0, 255);
    this._a = clamp(a, 0, 1);
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
   * Converts the color to a CSS-compatible RGBA string.
   * @returns The RGBA string (e.g., `rgba(255, 0, 0, 1)`).
   */
  public toRGBAString(): string {
    return `rgba(${this._r}, ${this._g}, ${this._b}, ${this._a})`;
  }

  /**
   * Converts the color to a glsl-compatible float32 array.
   * @returns The RGBA array (e.g. `[1, 0, 0, 1]` for red).
   */
  public toFloat32Array(): Float32Array {
    return new Float32Array([
      this._r / 255,
      this._g / 255,
      this._b / 255,
      this._a,
    ]);
  }
}
