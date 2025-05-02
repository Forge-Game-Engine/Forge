import { describe, expect, it } from 'vitest';
import { Color } from './color';

describe('Color', () => {
  it('should create a color using RGB values', () => {
    const color = new Color(255, 0, 128);

    expect(color.r).toBe(255);
    expect(color.g).toBe(0);
    expect(color.b).toBe(128);
    expect(color.toRGBString()).toBe('rgb(255, 0, 128)');
  });

  it('should clamp RGB values to the valid range (0-255)', () => {
    const color = new Color(300, -50, 128);

    expect(color.r).toBe(255); // Clamped to 255
    expect(color.g).toBe(0); // Clamped to 0
    expect(color.b).toBe(128); // Unchanged
  });

  it('should create a color using HSL values', () => {
    const color = Color.fromHSL(240, 100, 50);

    expect(color.r).toBe(0);
    expect(color.g).toBe(0);
    expect(color.b).toBe(255);
    expect(color.toRGBString()).toBe('rgb(0, 0, 255)');
  });

  it('should handle achromatic colors in HSL (saturation = 0)', () => {
    const color = Color.fromHSL(0, 0, 50);

    expect(color.r).toBe(128);
    expect(color.g).toBe(128);
    expect(color.b).toBe(128);
    expect(color.toRGBString()).toBe('rgb(128, 128, 128)');
  });

  it('should handle edge cases for HSL values', () => {
    const color1 = Color.fromHSL(0, 100, 50); // Pure red
    const color2 = Color.fromHSL(120, 100, 50); // Pure green
    const color3 = Color.fromHSL(360, 100, 50); // Pure red (360° = 0°)

    expect(color1.toRGBString()).toBe('rgb(255, 0, 0)');
    expect(color2.toRGBString()).toBe('rgb(0, 255, 0)');
    expect(color3.toRGBString()).toBe('rgb(255, 0, 0)');
  });

  it('should convert RGB values to a CSS-compatible string', () => {
    const color = new Color(34, 139, 34);

    expect(color.toRGBString()).toBe('rgb(34, 139, 34)');
  });
});
