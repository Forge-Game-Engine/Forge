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

  it('keeps RGB values above 1, for colors brighter than white', () => {
    const color = new Color(1.5, 3, 0.5);

    expect(color.r).toBe(1.5);
    expect(color.g).toBe(3);
    expect(color.b).toBe(0.5);
    expect(color.toFloat32Array()).toEqual(new Float32Array([1.5, 3, 0.5, 1]));
  });

  it('clamps negative RGB values to 0', () => {
    const color = new Color(-0.2, -1, 0.5);

    expect(color.r).toBe(0);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0.5);
  });

  it('clamps alpha to [0, 1]', () => {
    expect(new Color(1, 1, 1, 1.5).a).toBe(1);
    expect(new Color(1, 1, 1, -0.5).a).toBe(0);
  });

  it('clamps RGB values above 1 to 255 in its CSS string', () => {
    const color = new Color(1.5, 0.5, 2, 0.5);

    expect(color.toRGBAString()).toBe('rgba(255, 128, 255, 0.5)');
  });

  it('throws for an HSL saturation or lightness outside 0-100', () => {
    expect(() => Color.fromHSLA(0, 120, 50)).toThrow();
    expect(() => Color.fromHSLA(0, -1, 50)).toThrow();
    expect(() => Color.fromHSLA(0, 100, 150)).toThrow();
    expect(() => Color.fromHSLA(0, 100, -1)).toThrow();
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
