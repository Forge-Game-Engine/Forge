import { Entity } from 'forge/ecs';
import { ParameterizedForgeEvent } from 'forge/events';
import { Animation, OnAnimationChangeEvent } from './Animation';
import { AnimationCondition } from './AnimationCondition';
import { AnimationInputs } from './AnimationInputs';

/**
 * Metadata for an animation transition.
 */
export interface TransitionMetadata {
  /**
   * If true, the current animation must finish before transitioning to the next animation.
   * If false, the transition can happen immediately when the conditions are met.
   * @default true
   */
  finishCurrentAnimationBeforeTransitioning: boolean;
  /**
   * If true, the condition must be true at the end of the animation for the transition to occur
   * If false, the condition can be true at any point of the animation for the transition to occur
   * @default false
   */
  conditionMustBeTrueAtTheEndOfTheAnimation: boolean;
}

export const defaultTransitionMetadata: TransitionMetadata = {
  finishCurrentAnimationBeforeTransitioning: true,
  conditionMustBeTrueAtTheEndOfTheAnimation: false,
};

/**
 * Class to manage transitions between animation states in the animation controller
 */
export class AnimationTransition {
  /**
   * An array of states the animation can be in for this transition to be considered
   */
  public fromStates: string[];
  /**
   * The animation to transition to when the conditions are fulfilled
   */
  public toAnimation: Animation;

  /**
   * An array of conditions that must be fulfilled for the transition to occur
   */
  public conditions: AnimationCondition[];

  // Metadata
  public readonly finishCurrentAnimationBeforeTransitioning: boolean;
  public readonly conditionMustBeTrueAtTheEndOfTheAnimation: boolean;

  /**
   * A parameterized Forge Event that is raised when this transition occurs
   *
   * Note: This event is NOT called on the first transition from the 'entry' state.
   * This is a known limitation of the current implementation.
   */
  public onAnimationChange: OnAnimationChangeEvent;

  /**
   * Creates an instance of AnimationTransition
   * @param fromStates - the list of states to transition from
   * @param toAnimation - the animation to transition to
   * @param conditions - the list of animation conditions
   * @param metadata - the optional transition metadata
   */
  constructor(
    fromStates: string[],
    toAnimation: Animation,
    conditions: AnimationCondition[],
    metadata?: Partial<TransitionMetadata>,
  ) {
    const {
      finishCurrentAnimationBeforeTransitioning,
      conditionMustBeTrueAtTheEndOfTheAnimation,
    } = { ...defaultTransitionMetadata, ...metadata };

    this.finishCurrentAnimationBeforeTransitioning =
      finishCurrentAnimationBeforeTransitioning;
    this.conditionMustBeTrueAtTheEndOfTheAnimation =
      conditionMustBeTrueAtTheEndOfTheAnimation;

    this.fromStates = fromStates;
    this.toAnimation = toAnimation;

    this.conditions = conditions;

    this.onAnimationChange = new ParameterizedForgeEvent<Entity>(
      'OnAnimationChange',
    );
  }

  /**
   * Validates whether all conditions for this transition are met based on the provided animation inputs
   * @param animationInputs - the current animation inputs
   * @returns true if all conditions are met, false otherwise
   */
  public validateConditions(animationInputs: AnimationInputs): boolean {
    for (const condition of this.conditions) {
      const validation = condition.validateConditionFromInputs(animationInputs);

      if (!validation) {
        return false;
      }
    }

    return true;
  }
}
