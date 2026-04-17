import { describe, expect, it } from 'vitest';
import { AnimationTransition } from './AnimationTransition';
import { AnimationInputs } from './AnimationInputs';

describe('AnimationTransition', () => {
  describe('constructor', () => {
    it('should initialize with default exit type', () => {
      const transition = new AnimationTransition([]);

      expect(transition.exitType).toBe('immediate');
    });

    it('should set the exit type when provided', () => {
      const transition = new AnimationTransition([], {
        exitType: 'atEndOfAnimation',
      });

      expect(transition.exitType).toBe('atEndOfAnimation');
    });
  });

  describe('validateConditions', () => {
    it('should return true when all conditions are met', () => {
      const transition = new AnimationTransition([() => true, () => true]);

      const inputs: AnimationInputs = {} as AnimationInputs;
      expect(transition.satisfies(inputs)).toBe(true);
    });

    it('should return false when any condition is not met', () => {
      const transition = new AnimationTransition([() => true, () => false]);

      const inputs: AnimationInputs = {} as AnimationInputs;
      expect(transition.satisfies(inputs)).toBe(false);
    });

    it('should return true when no conditions are provided', () => {
      const transition = new AnimationTransition([]);

      const inputs: AnimationInputs = {} as AnimationInputs;
      expect(transition.satisfies(inputs)).toBe(true);
    });
  });
});
