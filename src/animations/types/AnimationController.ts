import { Animation } from './Animation';
import { AnimationInputs } from './AnimationInputs';
import { AnimationTransition } from './AnimationTransition';
import { DEFAULT_ANIMATION_STATES } from './DefaultAnimationStates';

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
    let nextAnimation: Animation | null = null;

    for (let i = 0; i < this.animationTransitions.length; i++) {
      const transition = this.animationTransitions[i];
      const isValidFromState = transition.fromStates.some(
        (s) => s === currentState || s === DEFAULT_ANIMATION_STATES.any,
      );

      if (!isValidFromState || !transition.validateConditions(inputs)) {
        continue;
      }

      const hasNextAnimationWithHigherPriority =
        this.nextAnimation && this.nextAnimation.index < i;

      const transitionAnimationsNow =
        (!endOfAnimation &&
          !transition.finishCurrentAnimationBeforeTransitioning) ||
        (endOfAnimation && !hasNextAnimationWithHigherPriority);

      if (transitionAnimationsNow) {
        nextAnimation = transition.toAnimation;

        break;
      }

      if (endOfAnimation && this.nextAnimation) {
        nextAnimation = this.nextAnimation.animation;

        break;
      }

      if (
        !hasNextAnimationWithHigherPriority &&
        !transition.conditionMustBeTrueAtTheEndOfTheAnimation
      ) {
        // to ensure that the next animation chosen has the highest priority, we must store its index
        this.nextAnimation = {
          animation: transition.toAnimation,
          index: i,
        };
      }
    }

    inputs.clearFrameEndInputs();

    return nextAnimation;
  }
}
