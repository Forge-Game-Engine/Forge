/*
Takes in the inputs and current animation.
Sets the animation and returns the new animation

States:
    Entry
    Exit
    Any 

    user defined

    It has a list of transitions. Each associated with 2 states
*/

import { Animation } from './Animation';
import { AnimationInputs } from './AnimationInputs';
import { AnimationTransition } from './AnimationTransition';
import { DEFAULT_ANIMATION_STATES } from './DefaultAnimationStates';

// TODO: add ability to use the 'exit' state
// TODO: possibly store states in an array
export class AnimationController {
  public animationTransitions: AnimationTransition[];
  public nextAnimation?: { animation: Animation; index: number };

  constructor(...animationTransitions: AnimationTransition[]) {
    this.animationTransitions = animationTransitions;
  }

  public registerTransition(transition: AnimationTransition) {
    this.animationTransitions.push(transition);
  }

  /**
   * Finds the next animation to play based on the transitions. Returns null if the animation is not changing.
   * If no rule is triggered at the end of an animation, returns the current animation
   * @param currentAnimation - the current animation
   * @param inputs - the animation inputs
   * @param endOfAnimation - whether we are at the end of the current animation
   * Returns null if the animation is not changing
   */
  public findNextAnimation(
    currentAnimation: Animation,
    inputs: AnimationInputs,
    endOfAnimation: boolean,
  ): Animation | null {
    const currentState = currentAnimation.name;

    let nextAnimation = this._getNextAnimation(
      currentState,
      inputs,
      endOfAnimation,
    );

    if (!nextAnimation && endOfAnimation) {
      nextAnimation = this.nextAnimation?.animation ?? currentAnimation;
    }

    if (nextAnimation) {
      this.nextAnimation = undefined;

      return nextAnimation;
    }

    return null;
  }

  public getEntryAnimation(inputs: AnimationInputs): Animation {
    const currentState = DEFAULT_ANIMATION_STATES.entry;

    const nextAnimation = this._getNextAnimation(currentState, inputs, true);

    if (!nextAnimation) {
      throw new Error(
        `No transition with satisfied conditions exists from '${currentState}'`,
      );
    }

    return nextAnimation;
  }

  private _getNextAnimation(
    currentState: string,
    inputs: AnimationInputs,
    endOfAnimation: boolean,
  ): Animation | null {
    for (let i = 0; i < this.animationTransitions.length; i++) {
      const transition = this.animationTransitions[i];

      if (
        (transition.fromState === currentState ||
          transition.fromState === DEFAULT_ANIMATION_STATES.any) &&
        transition.validateConditions(inputs)
      ) {
        if (
          !endOfAnimation &&
          !transition.finishCurrentAnimationBeforeTransitioning
        ) {
          inputs.resetTriggers();

          return transition.toAnimation;
        }

        if (endOfAnimation) {
          inputs.resetTriggers();

          if (this.nextAnimation && this.nextAnimation.index < i) {
            return this.nextAnimation.animation;
          }

          return transition.toAnimation;
        }

        if (
          transition.finishCurrentAnimationBeforeTransitioning &&
          !transition.conditionMustBeTrueAtTheEndOfTheAnimation
        ) {
          if (!this.nextAnimation || this.nextAnimation.index > i) {
            console.log(
              `setting next animation to ${transition.toAnimation.name}`,
            );
            // to ensure that the next animation chosen has the highest priority, we must store its index
            this.nextAnimation = {
              animation: transition.toAnimation,
              index: i,
            };
          }
        }
      }
    }

    inputs.resetTriggers();

    return null;
  }
}
