import { State } from './state.js';
import { Transition } from './transition.js';

export class FiniteStateMachine<TInput> {
  public readonly entryState: State<TInput>;
  public readonly exitState: State<TInput>;

  private readonly _states: State<TInput>[];
  private _currentState: State<TInput>;

  constructor() {
    this.entryState = {
      name: 'entry',
      transitions: [],
    };

    this.exitState = {
      name: 'exit',
      transitions: [],
    };

    this._states = [this.entryState, this.exitState];

    this._currentState = this.entryState;
  }

  public addTransition(
    fromState: State<TInput>,
    transition: Transition<TInput>,
  ): void {
    if (fromState === this.exitState) {
      throw new Error('Cannot add transitions from the exit state.');
    }

    fromState.transitions.push(transition);
  }

  public addState(state: State<TInput>): void {
    if (this._states.some((s) => s.name === state.name)) {
      throw new Error(`State with name "${state.name}" already exists.`);
    }

    this._states.push(state);
  }

  public getCurrentState(): State<TInput> {
    return this._currentState;
  }

  public update(input: TInput): void {
    for (const transition of this._currentState.transitions) {
      if (transition.satisfies(input)) {
        this._currentState = transition.toState;

        break;
      }
    }
  }
}
