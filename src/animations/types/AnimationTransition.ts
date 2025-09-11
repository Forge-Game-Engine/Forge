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
  public fromStates: string[];
  public toAnimation: Animation;

  // Conditions
  public conditions: AnimationCondition[];

  // Metadata
  public readonly finishCurrentAnimationBeforeTransitioning: boolean;
  public readonly conditionMustBeTrueAtTheEndOfTheAnimation: boolean;

  // Callback
  public onAnimationChange: OnAnimationChangeEvent; //TODO: this currently is not called on the first transition (from 'entry')

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
