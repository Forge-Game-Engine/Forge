import { Entity } from '../../ecs/index.js';
import { Animation } from './Animation.js';
import { AnimationInputs } from './AnimationInputs.js';
import { AnimationTransition } from './AnimationTransition.js';
import { DEFAULT_ANIMATION_STATES } from './DefaultAnimationStates.js';

type PendingTransition = {
  animationTransition: AnimationTransition;
  index: number;
};

/**
 * Class to manage animation transitions based on animation conditions and inputs
 */
export class AnimationController {
  /**
   * A list of animation transitions used to find the next animation
   */
  public animationTransitions: AnimationTransition[];
  /**
   * Stores a transition that meets its conditions but cannot execute immediately.
   * This happens when a transition's conditions are satisfied mid-animation, but the
   * transition requires waiting until the current animation finishes.
   *
   * The index represents the transition's priority (lower index = higher priority).
   */
  private _pendingTransition: PendingTransition | null = null;

  /**
   * Creates a new instance of AnimationController.
   * @param animationTransitions - an array of animation transitions to initialize the controller with
   */
  constructor(...animationTransitions: AnimationTransition[]) {
    this.animationTransitions = animationTransitions;
  }

  /**
   * Finds the next animation to play based on the transitions. Returns null if the animation is not changing.
   * If no transition is triggered at the end of an animation, returns the current animation
   * @param entity - the entity this controller is acting on
   * @param currentAnimation - the current animation
   * @param inputs - the animation inputs
   * @param endOfAnimation - whether we are at the end of the current animation
   * @returns the next animation, or null if the animation is not changing
   */
  public findNextAnimation(
    entity: Entity,
    currentAnimation: Animation,
    inputs: AnimationInputs,
    endOfAnimation: boolean,
  ): Animation | null {
    const currentState = currentAnimation.name;

    const nextAnimationTransition = this._getNextAnimationTransition(
      currentState,
      inputs,
      endOfAnimation,
    );

    if (nextAnimationTransition) {
      nextAnimationTransition.onAnimationChange.raise(entity);
      this._pendingTransition = null;

      return nextAnimationTransition.toAnimation;
    }

    return endOfAnimation ? currentAnimation : null;
  }

  /**
   * Gets the entry animation for the given inputs.
   * @param inputs - the animation inputs
   * @returns the animation to play on entry, based on the 'entry' state
   */
  public getEntryAnimation(inputs: AnimationInputs): Animation {
    const currentState = DEFAULT_ANIMATION_STATES.entry;

    const nextAnimationTransition = this._getNextAnimationTransition(
      currentState,
      inputs,
      true,
    );

    if (!nextAnimationTransition) {
      throw new Error(
        `No transition with satisfied conditions exists from '${currentState}'`,
      );
    }

    return nextAnimationTransition.toAnimation;
  }

  /**
   * Gets the next animation transition based on the current state, inputs, and whether we are at the end of the animation.
   * @param currentState - the current animation state
   * @param inputs - the animation inputs
   * @param endOfAnimation - whether we are at the end of the current animation
   * @returns the next animation transition, or null if none is found
   */
  private _getNextAnimationTransition(
    currentState: string,
    inputs: AnimationInputs,
    endOfAnimation: boolean,
  ): AnimationTransition | null {
    let nextAnimationTransition: AnimationTransition | null = null;

    // this ensures the 'any' state cannot override the 'begin' state
    const isEntryState = currentState === DEFAULT_ANIMATION_STATES.entry;

    for (let i = 0; i < this.animationTransitions.length; i++) {
      const transition = this.animationTransitions[i];

      const hasValidFromState = transition.fromStates.some(
        (s) =>
          s === currentState ||
          (s === DEFAULT_ANIMATION_STATES.any && !isEntryState),
      );

      if (!hasValidFromState || !transition.validateConditions(inputs)) {
        continue;
      }

      const hasPendingAnimationWithHigherPriority =
        this._pendingTransition && this._pendingTransition.index < i;

      const useCurrentAnimationTransition =
        (!endOfAnimation &&
          !transition.finishCurrentAnimationBeforeTransitioning) ||
        (endOfAnimation && !hasPendingAnimationWithHigherPriority);

      if (useCurrentAnimationTransition) {
        nextAnimationTransition = transition;

        break;
      }

      if (
        !hasPendingAnimationWithHigherPriority &&
        !transition.conditionMustBeTrueAtTheEndOfTheAnimation
      ) {
        this._pendingTransition = {
          animationTransition: transition,
          index: i,
        };
      }
    }

    if (endOfAnimation && !nextAnimationTransition && this._pendingTransition) {
      nextAnimationTransition = this._pendingTransition.animationTransition;
    }

    inputs.clearFrameEndInputs();

    return nextAnimationTransition;
  }
}
