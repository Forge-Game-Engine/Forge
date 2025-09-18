import { describe, expect, it, vi } from 'vitest';
import { AnimationTransition } from './AnimationTransition';
import { Animation } from './Animation';
import {
  AnimationCondition,
  AnimationToggleCondition,
} from './AnimationCondition';
import { AnimationInputs } from './AnimationInputs';

describe('AnimationTransition', () => {
  const mockAnimation: Animation = {
    name: 'mockAnimation',
  } as Animation;

  const mockConditionTrue: AnimationCondition = {
    validateConditionFromInputs: vi.fn().mockReturnValue(true),
  } as unknown as AnimationToggleCondition;

  const mockConditionFalse: AnimationCondition = {
    validateConditionFromInputs: vi.fn().mockReturnValue(false),
  } as unknown as AnimationToggleCondition;

  describe('constructor', () => {
    it('should initialize with default metadata when none is provided', () => {
      const transition = new AnimationTransition(['state1'], mockAnimation, [
        mockConditionTrue,
      ]);

      expect(transition.finishCurrentAnimationBeforeTransitioning).toBe(true);
      expect(transition.conditionMustBeTrueAtTheEndOfTheAnimation).toBe(false);
    });

    it('should override default metadata when provided', () => {
      const transition = new AnimationTransition(
        ['state1'],
        mockAnimation,
        [mockConditionTrue],
        {
          finishCurrentAnimationBeforeTransitioning: false,
          conditionMustBeTrueAtTheEndOfTheAnimation: true,
        },
      );

      expect(transition.finishCurrentAnimationBeforeTransitioning).toBe(false);
      expect(transition.conditionMustBeTrueAtTheEndOfTheAnimation).toBe(true);
    });
  });

  describe('validateConditions', () => {
    it('should return true when all conditions are met', () => {
      const transition = new AnimationTransition(['state1'], mockAnimation, [
        mockConditionTrue,
        mockConditionTrue,
      ]);

      const inputs: AnimationInputs = {} as AnimationInputs;
      expect(transition.validateConditions(inputs)).toBe(true);
    });

    it('should return false when any condition is not met', () => {
      const transition = new AnimationTransition(['state1'], mockAnimation, [
        mockConditionTrue,
        mockConditionFalse,
      ]);

      const inputs: AnimationInputs = {} as AnimationInputs;
      expect(transition.validateConditions(inputs)).toBe(false);
    });

    it('should return true when no conditions are provided', () => {
      const transition = new AnimationTransition(['state1'], mockAnimation, []);

      const inputs: AnimationInputs = {} as AnimationInputs;
      expect(transition.validateConditions(inputs)).toBe(true);
    });
  });
});
