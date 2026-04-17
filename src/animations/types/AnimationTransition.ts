import { Transition } from '../../finite-state-machine/index.js';
import { Predicate } from '../../utilities/index.js';
import { AnimationInputs } from './AnimationInputs.js';

export type AnimationExitType = 'immediate' | 'atEndOfAnimation';

export type AnimationTransitionOptions = {
  exitType?: AnimationExitType;
};

const defaultAnimationTransitionOptions = {
  exitType: 'immediate' as AnimationExitType,
};

export class AnimationTransition extends Transition<AnimationInputs> {
  public readonly exitType: AnimationExitType;

  constructor(
    predicates: Predicate<AnimationInputs>[],
    options: AnimationTransitionOptions = {},
  ) {
    super(...predicates);

    const { exitType } = { ...defaultAnimationTransitionOptions, ...options };

    this.exitType = exitType;
  }

  public override satisfies(input: AnimationInputs): boolean {
    return super.satisfies(input);
  }
}
