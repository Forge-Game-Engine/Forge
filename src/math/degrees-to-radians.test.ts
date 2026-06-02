import { describe, expect, it } from 'vitest';
import { degreesToRadians } from './degrees-to-radians';

describe('degreesToRadians', () => {
  it('should convert 0 degrees to 0 radians', () => {
    expect(degreesToRadians(0)).toBe(0);
  });

  it('should convert 90 degrees to π/2 radians', () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
  });

  it('should convert 180 degrees to π radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
  });

  it('should convert 270 degrees to 3π/2 radians', () => {
    expect(degreesToRadians(270)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('should convert 360 degrees to 2π radians', () => {
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
  });

  it('should handle negative degrees', () => {
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2);
  });

  it('should handle degrees greater than 360', () => {
    expect(degreesToRadians(450)).toBeCloseTo((5 * Math.PI) / 2);
  });
});
