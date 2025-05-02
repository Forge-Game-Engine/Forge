import { clamp } from '../math';

/**
 * The `Color` class represents a color that can be created using RGB or HSL.
 */
export class Color {
  private _r: number;
  private _g: number;
  private _b: number;

  /**
   * Constructs a new `Color` instance using RGB values.
   * @param r - The red component (0-255).
   * @param g - The green component (0-255).
   * @param b - The blue component (0-255).
   */
  constructor(r: number, g: number, b: number) {
    this._r = clamp(r, 0, 255);
    this._g = clamp(g, 0, 255);
    this._b = clamp(b, 0, 255);
  }

  /**
   * Creates a `Color` instance using HSL values.
   * @param h - The hue (0-360).
   * @param s - The saturation (0-100).
   * @param l - The lightness (0-100).
   * @returns A new `Color` instance.
   */
  public static fromHSL(h: number, s: number, l: number): Color {
    const normalizedH = h / 360;
    const normalizedS = s / 100;
    const normalizedL = l / 100;

    let r: number, g: number, b: number;

    if (normalizedS === 0) {
      r = g = b = normalizedL; // Achromatic
    } else {
      const hueToRGB = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q =
        normalizedL < 0.5
          ? normalizedL * (1 + normalizedS)
          : normalizedL + normalizedS - normalizedL * normalizedS;
      const p = 2 * normalizedL - q;

      r = hueToRGB(p, q, normalizedH + 1 / 3);
      g = hueToRGB(p, q, normalizedH);
      b = hueToRGB(p, q, normalizedH - 1 / 3);
    }

    return new Color(
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
    );
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
   * Converts the color to a CSS-compatible RGB string.
   * @returns The RGB string (e.g., `rgb(255, 0, 0)`).
   */
  public toRGBString(): string {
    return `rgb(${this._r}, ${this._g}, ${this._b})`;
  }
}
