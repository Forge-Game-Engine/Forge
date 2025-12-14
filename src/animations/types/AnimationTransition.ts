import { Transition } from '../../finite-state-machine';
import { Predicate } from '../../utilities';
import { AnimationInputs } from './AnimationInputs';

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
