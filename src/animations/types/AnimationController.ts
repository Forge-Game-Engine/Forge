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

export const ANY_STATE = 'any';
export const ENTRY_STATE = 'entry';

import { Animation } from './Animation';
import { AnimationInputs } from './AnimationInputs';
import { AnimationTransition } from './AnimationTransition';

// TODO: add ability to use the 'exit' state
// TODO: possibly store states in an array
export class AnimationController {
  public animationTransitions: AnimationTransition[];
  public nextAnimation?: Animation;

  constructor(animationTransitions: AnimationTransition[]) {
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

    const nextAnimation = this._getNextAnimation(
      currentState,
      inputs,
      endOfAnimation,
    );

    if (nextAnimation) {
      return nextAnimation;
    }

    if (endOfAnimation && this.nextAnimation) {
      return this.nextAnimation ?? currentAnimation;
    }

    return null;
  }

  public getEntryAnimation(inputs: AnimationInputs): Animation {
    const currentState = ENTRY_STATE;

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
    for (const transition of this.animationTransitions) {
      if (
        (transition.fromState === currentState ||
          transition.fromState === ANY_STATE) &&
        transition.validateConditions(inputs)
      ) {
        if (
          endOfAnimation ||
          !transition.finishCurrentAnimationBeforeTransitioning
        ) {
          return transition.toAnimation;
        }

        if (
          transition.finishCurrentAnimationBeforeTransitioning &&
          !transition.conditionMustBeTrueAtTheEndOfTheAnimation
        ) {
          this.nextAnimation = transition.toAnimation;
        }
      }
    }

    return null;
  }
}
