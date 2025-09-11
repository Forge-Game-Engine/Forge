import { Entity } from '../../ecs';
import { Animation } from './Animation';
import { AnimationInputs } from './AnimationInputs';
import { AnimationTransition } from './AnimationTransition';
import { DEFAULT_ANIMATION_STATES } from './DefaultAnimationStates';

export class AnimationController {
  public animationTransitions: AnimationTransition[];
  public nextAnimationTransition?: {
    animationTransition: AnimationTransition;
    index: number;
  };

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
    entity: Entity,
    currentAnimation: Animation,
    inputs: AnimationInputs,
    endOfAnimation: boolean,
  ): Animation | null {
    const currentState = currentAnimation.name;

    let nextAnimationTransition = this._getNextAnimation(
      currentState,
      inputs,
      endOfAnimation,
    );

    if (!nextAnimationTransition && endOfAnimation) {
      nextAnimationTransition =
        this.nextAnimationTransition?.animationTransition ?? null;
    }

    if (nextAnimationTransition) {
      nextAnimationTransition.onAnimationChange.raise(entity);
      this.nextAnimationTransition = undefined;
    }

    const nextAnimation = nextAnimationTransition?.toAnimation ?? null;

    if (endOfAnimation) {
      return nextAnimation ?? currentAnimation;
    }

    return nextAnimation;
  }

  public getEntryAnimation(inputs: AnimationInputs): Animation {
    const currentState = DEFAULT_ANIMATION_STATES.entry;

    const nextAnimationTransition = this._getNextAnimation(
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

  private _getNextAnimation(
    currentState: string,
    inputs: AnimationInputs,
    endOfAnimation: boolean,
  ): AnimationTransition | null {
    let nextAnimationTransition: AnimationTransition | null = null;

    for (let i = 0; i < this.animationTransitions.length; i++) {
      const transition = this.animationTransitions[i];
      const isValidFromState = transition.fromStates.some(
        (s) => s === currentState || s === DEFAULT_ANIMATION_STATES.any,
      );

      if (!isValidFromState || !transition.validateConditions(inputs)) {
        continue;
      }

      const hasNextAnimationWithHigherPriority =
        this.nextAnimationTransition && this.nextAnimationTransition.index < i;

      const transitionAnimationsNow =
        (!endOfAnimation &&
          !transition.finishCurrentAnimationBeforeTransitioning) ||
        (endOfAnimation && !hasNextAnimationWithHigherPriority);

      if (transitionAnimationsNow) {
        nextAnimationTransition = transition;

        break;
      }

      if (endOfAnimation && this.nextAnimationTransition) {
        nextAnimationTransition =
          this.nextAnimationTransition.animationTransition;

        break;
      }

      if (
        !hasNextAnimationWithHigherPriority &&
        !transition.conditionMustBeTrueAtTheEndOfTheAnimation
      ) {
        // to ensure that the next animation chosen has the highest priority, we must store its index
        this.nextAnimationTransition = {
          animationTransition: transition,
          index: i,
        };
      }
    }

    inputs.clearFrameEndInputs();

    return nextAnimationTransition;
  }
}
