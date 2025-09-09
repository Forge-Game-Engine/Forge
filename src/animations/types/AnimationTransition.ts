/*
Conditions:
    An optional list of conditions
    Each condition has a target input
    For triggers and toggles, the condition is true when the input is true
    For numbers, their is another option for greater than, less than, equal to
    For strings, the condition is true when the input is equal to the value

Metadata:
    - Finish current animation first
    - Condition must be true only at the end of the animation

Callbacks:
    A single callback that is called when the trigger is activated.
    Always get raised, but the user can attach a listener to it.
    takes in the entity, previous and next animations
*/

interface TransitionMetadata {
  finishCurrentAnimationBeforeTransitioning: boolean;
  conditionMustBeTrueAtTheEndOfTheAnimation: boolean;
}

const defaultTransitionMetadata: TransitionMetadata = {
  finishCurrentAnimationBeforeTransitioning: true,
  conditionMustBeTrueAtTheEndOfTheAnimation: false,
};

import { Entity } from '../../ecs';
import { ParameterizedForgeEvent } from '../../events';
import { Animation, OnAnimationChangeEvent } from './Animation';
import { AnimationCondition } from './AnimationCondition';
import { AnimationInputs } from './AnimationInputs';

export class AnimationTransition {
  // States
  public fromState: string;
  public toAnimation: Animation;

  // Conditions
  public conditions: AnimationCondition[];

  // Metadata
  public readonly finishCurrentAnimationBeforeTransitioning: boolean;
  public readonly conditionMustBeTrueAtTheEndOfTheAnimation: boolean;

  // Callback
  public onAnimationChange: OnAnimationChangeEvent;

  // TODO: look at changing this to take in a fromAnimation. This will mean that the entry, exit and any states will also have to be animations somehow
  // TODO: allow this to take a list of fromStates, to make transitions easier to create
  constructor(
    fromState: string,
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

    this.fromState = fromState;
    this.toAnimation = toAnimation;

    this.conditions = conditions;

    this.onAnimationChange = new ParameterizedForgeEvent<Entity>(
      'OnAnimationChange',
    );
  }

  public validateConditions(animationInputs: AnimationInputs): boolean {
    let conditionInputFound: boolean;

    for (const condition of this.conditions) {
      conditionInputFound = false;

      for (const input of animationInputs.inputs) {
        if (condition.inputName === input.name) {
          const validation = condition.validateCondition(input.value);

          if (validation === null) {
            continue;
          }

          conditionInputFound = true;

          if (validation === false) {
            return false;
          }

          break;
        }
      }

      if (!conditionInputFound) {
        throw new Error(
          `Condition from animation ${this.fromState} to ${this.toAnimation.name} looking for input: ${condition.inputName} did not find any inputs `,
        );
      }
    }

    return true;
  }
}
