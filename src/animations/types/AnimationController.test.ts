import { describe, expect, it, vi } from 'vitest';
import { AnimationController } from './AnimationController';
import { Entity } from '../../ecs';
import { AnimationClip } from './AnimationClip';
import { AnimationInputs } from './AnimationInputs';
import {
  AnimationTransition,
  defaultTransitionMetadata,
  TransitionMetadata,
} from './AnimationTransition';
import { DEFAULT_ANIMATION_STATES } from './DefaultAnimationStates';

describe('AnimationController', () => {
  const currentAnimation = { name: 'idle' } as AnimationClip;
  const nextAnimation1 = { name: 'run' } as AnimationClip;
  const nextAnimation2 = { name: 'jump' } as AnimationClip;

  function getMockTransition(
    fromStates: string[],
    toAnimation: AnimationClip,
    conditionFulfilled: boolean,
    metadata?: Partial<TransitionMetadata>,
  ) {
    const {
      finishCurrentAnimationBeforeTransitioning,
      conditionMustBeTrueAtTheEndOfTheAnimation,
    } = { ...defaultTransitionMetadata, ...metadata };

    return {
      fromStates,
      toAnimation,
      finishCurrentAnimationBeforeTransitioning,
      conditionMustBeTrueAtTheEndOfTheAnimation,
      validateConditions: vi.fn().mockReturnValue(conditionFulfilled),
      onAnimationChange: { raise: vi.fn() },
    } as unknown as AnimationTransition;
  }

  describe('findNextAnimation', () => {
    it('should return the next animation if a valid transition is found', () => {
      const mockEntity = {} as Entity;

      const inputs = new AnimationInputs();
      const mockTransitionNotInUse = getMockTransition(
        [currentAnimation.name],
        nextAnimation2,
        false,
      );
      const mockTransitionInUse = getMockTransition(
        [currentAnimation.name],
        nextAnimation1,
        true,
      );

      const controller = new AnimationController(
        mockTransitionNotInUse,
        mockTransitionInUse,
      );

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );

      expect(result).toBe(nextAnimation1);
      expect(mockTransitionInUse.onAnimationChange.raise).toHaveBeenCalledWith(
        mockEntity,
      );
      expect(
        mockTransitionNotInUse.onAnimationChange.raise,
      ).not.toHaveBeenCalled();
    });

    it('should return null if no valid transition is found and not at the end of animation', () => {
      const mockEntity = {} as Entity;
      const currentAnimation = { name: 'idle' } as AnimationClip;
      const inputs = new AnimationInputs();
      const mockTransition = getMockTransition(
        [nextAnimation1.name],
        nextAnimation2,
        true,
      );

      const controller = new AnimationController(mockTransition);

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        false,
      );

      expect(result).toBeNull();
    });
    it('should return null if a valid transition is found, but not at the end of animation', () => {
      const mockEntity = {} as Entity;
      const currentAnimation = { name: 'idle' } as AnimationClip;
      const inputs = new AnimationInputs();
      const mockTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation1,
        true,
      );

      const controller = new AnimationController(mockTransition);

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        false,
      );

      expect(result).toBeNull();
    });

    it('should return the current animation if at the end of animation and no valid transition is found', () => {
      const mockEntity = {} as Entity;
      const currentAnimation = { name: 'idle' } as AnimationClip;
      const inputs = new AnimationInputs();
      const mockTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation1,
        false,
      );

      const controller = new AnimationController(mockTransition);

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );

      expect(result).toBe(currentAnimation);
    });

    it('should use pending transitions at the end of animation', () => {
      const mockEntity = {} as Entity;
      const currentAnimation = { name: 'idle' } as AnimationClip;
      const inputs = new AnimationInputs();
      const mockTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation1,
        true,
      );

      const controller = new AnimationController(mockTransition);

      let result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        false,
      );

      expect(result).toBeNull();

      // The transition should not be pending, so make the condition false
      mockTransition.validateConditions = vi.fn().mockReturnValue(false);

      result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        false,
      );

      expect(result).toBeNull();
      result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );
      expect(result).toBe(nextAnimation1);
    });

    it('should prioritize transitions listed first if both have fulfilled conditions', () => {
      const mockEntity = {} as Entity;
      const inputs = new AnimationInputs();

      // Both transitions have fulfilled conditions, first one should be chosen
      const firstTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation1,
        true,
      );
      const secondTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation2,
        true,
      );

      const controller = new AnimationController(
        firstTransition,
        secondTransition,
      );

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );

      expect(result).toBe(nextAnimation1);
      expect(firstTransition.onAnimationChange.raise).toHaveBeenCalledWith(
        mockEntity,
      );
      expect(secondTransition.onAnimationChange.raise).not.toHaveBeenCalled();
    });

    it('should only use transitions with the correct from state', () => {
      const mockEntity = {} as Entity;
      const inputs = new AnimationInputs();

      // Transition with wrong from state
      const wrongStateTransition = getMockTransition(
        ['wrongState'],
        nextAnimation1,
        true,
      );
      // Transition with correct from state
      const correctStateTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation2,
        true,
      );

      const controller = new AnimationController(
        wrongStateTransition,
        correctStateTransition,
      );

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );

      expect(result).toBe(nextAnimation2);
      expect(
        wrongStateTransition.onAnimationChange.raise,
      ).not.toHaveBeenCalled();
      expect(
        correctStateTransition.onAnimationChange.raise,
      ).toHaveBeenCalledWith(mockEntity);
    });

    it('should only use a transition if the conditions are fulfilled', () => {
      const mockEntity = {} as Entity;
      const inputs = new AnimationInputs();

      // Transition with unfulfilled conditions
      const unfulfilledTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation1,
        false,
      );
      // Transition with fulfilled conditions
      const fulfilledTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation2,
        true,
      );

      const controller = new AnimationController(
        unfulfilledTransition,
        fulfilledTransition,
      );

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );

      expect(result).toBe(nextAnimation2);
      expect(
        unfulfilledTransition.onAnimationChange.raise,
      ).not.toHaveBeenCalled();
      expect(fulfilledTransition.onAnimationChange.raise).toHaveBeenCalledWith(
        mockEntity,
      );
    });

    it('should ignore pending transitions if a transition set to occur immediately is fulfilled', () => {
      const mockEntity = {} as Entity;
      const inputs = new AnimationInputs();

      // Transition that requires finishing current animation (will be pending)
      const pendingTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation1,
        true,
        { finishCurrentAnimationBeforeTransitioning: true },
      );
      // Transition that can occur immediately
      const immediateTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation2,
        false,
        { finishCurrentAnimationBeforeTransitioning: false },
      );

      const controller = new AnimationController(
        pendingTransition,
        immediateTransition,
      );

      // First call - should make the first transition pending
      let result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        false,
      );

      expect(result).toBeNull();
      expect(
        immediateTransition.onAnimationChange.raise,
      ).not.toHaveBeenCalled();
      expect(pendingTransition.onAnimationChange.raise).not.toHaveBeenCalled();

      immediateTransition.validateConditions = vi.fn().mockReturnValue(true);

      // Second call - should use the immediate transition
      result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        false,
      );

      expect(result).toBe(nextAnimation2);
      expect(immediateTransition.onAnimationChange.raise).toHaveBeenCalledWith(
        mockEntity,
      );
      expect(pendingTransition.onAnimationChange.raise).not.toHaveBeenCalled();
    });

    it('should successfully use transitions with multiple from states', () => {
      const mockEntity = {} as Entity;
      const inputs = new AnimationInputs();
      const walkAnimation = { name: 'walk' } as AnimationClip;

      // Transition that accepts multiple from states
      const multiStateTransition = getMockTransition(
        [walkAnimation.name, 'sprint', currentAnimation.name],
        nextAnimation1,
        true,
      );

      const controller = new AnimationController(multiStateTransition);

      // Test with the current animation state
      let result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );

      expect(result).toBe(nextAnimation1);
      expect(multiStateTransition.onAnimationChange.raise).toHaveBeenCalledWith(
        mockEntity,
      );

      // Reset the mock
      vi.clearAllMocks();

      result = controller.findNextAnimation(
        mockEntity,
        walkAnimation,
        inputs,
        true,
      );

      expect(result).toBe(nextAnimation1);
      expect(multiStateTransition.onAnimationChange.raise).toHaveBeenCalledWith(
        mockEntity,
      );
    });
  });

  describe('any state', () => {
    it('should use the "any" state as if it was the current state', () => {
      const mockEntity = {} as Entity;
      const inputs = new AnimationInputs();

      const anyStateTransition = getMockTransition(
        [DEFAULT_ANIMATION_STATES.any],
        nextAnimation1,
        true,
      );

      const specificStateTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation2,
        true,
      );

      const controller = new AnimationController(
        anyStateTransition,
        specificStateTransition,
      );

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );

      expect(result).toBe(nextAnimation1);
      expect(anyStateTransition.onAnimationChange.raise).toHaveBeenCalledWith(
        mockEntity,
      );
      expect(
        specificStateTransition.onAnimationChange.raise,
      ).not.toHaveBeenCalled();
    });

    it('should not override the begin state, when using "any"', () => {
      const inputs = new AnimationInputs();

      const anyTransition = getMockTransition(
        [DEFAULT_ANIMATION_STATES.any],
        nextAnimation2,
        true,
      );

      const entryTransition = getMockTransition(
        [DEFAULT_ANIMATION_STATES.entry],
        nextAnimation1,
        true,
      );

      const controller = new AnimationController(
        anyTransition,
        entryTransition,
      );

      const result = controller.getEntryAnimation(inputs);

      expect(result).toBe(nextAnimation1);
    });

    it('should not use the "any" state if its conditions are not fulfilled', () => {
      const mockEntity = {} as Entity;
      const inputs = new AnimationInputs();

      const anyStateTransition = getMockTransition(
        [DEFAULT_ANIMATION_STATES.any],
        nextAnimation1,
        false,
      );

      const specificStateTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation2,
        true,
      );

      const controller = new AnimationController(
        anyStateTransition,
        specificStateTransition,
      );

      const result = controller.findNextAnimation(
        mockEntity,
        currentAnimation,
        inputs,
        true,
      );

      expect(result).toBe(nextAnimation2);
      expect(anyStateTransition.onAnimationChange.raise).not.toHaveBeenCalled();
      expect(
        specificStateTransition.onAnimationChange.raise,
      ).toHaveBeenCalledWith(mockEntity);
    });
  });

  describe('getEntryAnimation', () => {
    it('should throw an error if no entry transition is found', () => {
      const inputs = new AnimationInputs();

      const nonEntryTransition = getMockTransition(
        [currentAnimation.name, 'random'],
        nextAnimation1,
        true,
      );

      const controller = new AnimationController(nonEntryTransition);

      expect(() => controller.getEntryAnimation(inputs)).toThrow(
        `No transition with satisfied conditions exists from '${DEFAULT_ANIMATION_STATES.entry}'`,
      );
    });

    it('should throw an error if no entry transition with fulfilled conditions is found', () => {
      const inputs = new AnimationInputs();

      const entryTransitionUnfulfilled = getMockTransition(
        [DEFAULT_ANIMATION_STATES.entry],
        nextAnimation1,
        false,
      );

      const controller = new AnimationController(entryTransitionUnfulfilled);

      expect(() => controller.getEntryAnimation(inputs)).toThrow(
        `No transition with satisfied conditions exists from '${DEFAULT_ANIMATION_STATES.entry}'`,
      );
    });

    it('should choose the transition with the entry state', () => {
      const inputs = new AnimationInputs();

      const entryTransition = getMockTransition(
        [DEFAULT_ANIMATION_STATES.entry],
        nextAnimation1,
        true,
      );

      const nonEntryTransition = getMockTransition(
        [currentAnimation.name],
        nextAnimation2,
        true,
      );

      const controller = new AnimationController(
        nonEntryTransition,
        entryTransition,
      );

      const result = controller.getEntryAnimation(inputs);

      expect(result).toBe(nextAnimation1);
    });

    it('should choose the correct entry transition if multiple with conditions exist', () => {
      const inputs = new AnimationInputs();

      const firstEntryTransition = getMockTransition(
        [DEFAULT_ANIMATION_STATES.entry],
        nextAnimation1,
        false,
      );

      const secondEntryTransition = getMockTransition(
        [DEFAULT_ANIMATION_STATES.entry],
        nextAnimation2,
        true,
      );

      const controller = new AnimationController(
        firstEntryTransition,
        secondEntryTransition,
      );

      const result = controller.getEntryAnimation(inputs);

      expect(result).toBe(nextAnimation2);
    });
  });
});
