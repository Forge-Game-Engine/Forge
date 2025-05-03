import { describe, expect, it } from 'vitest';
import { Color } from './color';

describe('Color', () => {
  it('should create a color using RGB values', () => {
    const color = new Color(255, 0, 128);

    expect(color.r).toBe(255);
    expect(color.g).toBe(0);
    expect(color.b).toBe(128);
    expect(color.toRGBAString()).toBe('rgba(255, 0, 128, 1)');
  });

  it('should clamp RGB values to the valid range (0-255)', () => {
    const color = new Color(300, -50, 128);

    expect(color.r).toBe(255); // Clamped to 255
    expect(color.g).toBe(0); // Clamped to 0
    expect(color.b).toBe(128); // Unchanged
  });

  it('should create a color using HSL values', () => {
    const color = Color.fromHSLA(240, 100, 50);

    expect(color.r).toBe(0);
    expect(color.g).toBe(0);
    expect(color.b).toBe(255);
    expect(color.toRGBAString()).toBe('rgba(0, 0, 255, 1)');
  });

  it('should handle achromatic colors in HSL (saturation = 0)', () => {
    const color = Color.fromHSLA(0, 0, 50);

    expect(color.r).toBe(128);
    expect(color.g).toBe(128);
    expect(color.b).toBe(128);
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
    const color = new Color(34, 139, 34);

    expect(color.toRGBAString()).toBe('rgba(34, 139, 34, 1)');
  });
});
