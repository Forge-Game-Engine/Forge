import { describe, expect, it } from 'vitest';
import { Color } from './color';

describe('Color', () => {
  it('should create a color using RGB values', () => {
    const color = new Color(1, 0, 0.5);

    expect(color.r).toBe(1);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0.5);
    expect(color.toRGBAString()).toBe('rgba(255, 0, 128, 1)');
  });

  it('should keep RGB values above 1 for HDR colors', () => {
    const color = new Color(4, 2, 0.5);

    expect(color.r).toBe(4);
    expect(color.g).toBe(2);
    expect(color.b).toBe(0.5);
    expect(color.toFloat32Array()).toEqual(new Float32Array([4, 2, 0.5, 1]));
  });

  it('should clamp negative RGB values to 0', () => {
    const color = new Color(-0.2, -3, 0.5);

    expect(color.r).toBe(0);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0.5);
  });

  it('should clamp alpha to the range 0-1', () => {
    expect(new Color(1, 1, 1, 1.5).a).toBe(1);
    expect(new Color(1, 1, 1, -0.5).a).toBe(0);
  });

  it.each([
    ['r', [Number.NaN, 0, 0, 1]],
    ['g', [0, Number.POSITIVE_INFINITY, 0, 1]],
    ['b', [0, 0, Number.NEGATIVE_INFINITY, 1]],
    ['a', [0, 0, 0, Number.NaN]],
  ])('should throw when channel %s is not finite', (channel, [r, g, b, a]) => {
    expect(() => new Color(r, g, b, a)).toThrow(`channel "${channel}"`);
  });

  it('should clamp overbright channels to 255 in the CSS string', () => {
    const color = new Color(4, 0.5, 1.2, 0.5);

    expect(color.toRGBAString()).toBe('rgba(255, 128, 255, 0.5)');
  });

  it('should create a color using HSL values', () => {
    const color = Color.fromHSLA(220, 100, 50);

    expect(color.toRGBAString()).toBe('rgba(0, 85, 255, 1)');
    expect(color.r).toBe(0);
    expect(color.g).toBeCloseTo(0.3333333333333328);
    expect(color.b).toBe(1);
  });

  it('should handle achromatic colors in HSL (saturation = 0)', () => {
    const color = Color.fromHSLA(0, 0, 50);

    expect(color.r).toBe(0.5);
    expect(color.g).toBe(0.5);
    expect(color.b).toBe(0.5);
    expect(color.toRGBAString()).toBe('rgba(128, 128, 128, 1)');
  });

  it('should handle edge cases for HSL values', () => {
    const color1 = Color.fromHSLA(0, 100, 50); // Pure red
    const color2 = Color.fromHSLA(120, 100, 50); // Pure green
    const color3 = Color.fromHSLA(360, 100, 50); // Pure red (360° = 0°)

    expect(color1.toRGBAString()).toBe('rgba(255, 0, 0, 1)');
    expect(color2.toRGBAString()).toBe('rgba(0, 255, 0, 1)');
    expect(color3.toRGBAString()).toBe('rgba(255, 0, 0, 1)');
  });

  it('should convert RGB values to a CSS-compatible string', () => {
    const color = new Color(
      0.133333333333333,
      0.54509803921568,
      0.133333333333333,
    );

    expect(color.toRGBAString()).toBe('rgba(34, 139, 34, 1)');
  });

  it('should convert the color to a glsl-compatible Float32Array', () => {
    const color = new Color(1, 0.5, 0.28444444444444444, 0.5);

    const floatArray = color.toFloat32Array();

    expect(floatArray).toEqual(
      new Float32Array([1, 0.5, 0.2844444513320923, 0.5]),
    );
  });
});
