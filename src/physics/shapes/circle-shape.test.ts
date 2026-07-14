import { describe, expect, it } from 'vitest';
import { CircleShape } from './circle-shape.js';

describe('CircleShape', () => {
  describe('constructor', () => {
    it('should create a circle shape with the given radius', () => {
      const circle = new CircleShape(5);

      expect(circle.radius).toBe(5);
      expect(circle.type).toBe('circle');
    });

    it('should throw an error if the radius is zero', () => {
      expect(() => new CircleShape(0)).toThrow();
    });

    it('should throw an error if the radius is negative', () => {
      expect(() => new CircleShape(-1)).toThrow();
    });
  });

  describe('getArea', () => {
    it('should calculate the area of the circle', () => {
      const circle = new CircleShape(2);

      expect(circle.getArea()).toBeCloseTo(Math.PI * 4);
    });
  });

  describe('getMomentOfInertia', () => {
    it('should calculate the moment of inertia for a given mass', () => {
      const circle = new CircleShape(2);
      const mass = 10;

      expect(circle.getMomentOfInertia(mass)).toBeCloseTo((mass * 4) / 2);
    });
  });

  describe('getBoundingRadius', () => {
    it('should return the radius of the circle', () => {
      const circle = new CircleShape(3);

      expect(circle.getBoundingRadius()).toBe(3);
    });
  });
});
