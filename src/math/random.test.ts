import { beforeEach, describe, expect, it } from 'vitest';
import { Random } from './random';

describe('Random', () => {
  let random: Random;

  beforeEach(() => {
    random = new Random('test-seed');
  });

  describe('randomInt', () => {
    it('should generate a random integer between the specified min and max values (inclusive)', () => {
      const min = 1;
      const max = 10;
      const value = random.randomInt(min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    });

    it('should generate consistent random integers with the same seed', () => {
      const random1 = new Random('test-seed');
      const random2 = new Random('test-seed');
      expect(random1.randomInt(1, 10)).toBe(random2.randomInt(1, 10));
    });
  });

  describe('randomFloat', () => {
    it('should generate a random float between the specified min and max values (inclusive)', () => {
      const min = 1.0;
      const max = 10.0;
      const value = random.randomFloat(min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    });

    it('should generate consistent random floats with the same seed', () => {
      const random1 = new Random('test-seed');
      const random2 = new Random('test-seed');
      expect(random1.randomFloat(1.0, 10.0)).toBeCloseTo(
        random2.randomFloat(1.0, 10.0),
      );
    });
  });
});
