import { State } from './state.js';
import { Transition } from './transition.js';

export class FiniteStateMachine<TInput, TState extends State> {
  private _currentState: TState;
  private readonly _states: Map<TState, Transition<TInput, TState>[]>;

  constructor(states: TState[], startingState?: TState) {
    if (states.length === 0) {
      throw new Error(
        'FiniteStateMachine must be initialized with at least one state.',
      );
    }

    if (startingState && !states.includes(startingState)) {
      throw new Error('Starting state must be one of the provided states.');
    }

    this._states = new Map();

    for (const state of states) {
      this.addState(state);
    }

    this._currentState = startingState || states[0];
  }

  public addTransition(
    fromState: TState,
    transition: Transition<TInput, TState>,
  ): void {
    const stateTransitions = this._states.get(fromState);

    if (!stateTransitions) {
      throw new Error(
        `State with name "${fromState.name}" does not exist in the finite state machine.`,
      );
    }

    stateTransitions.push(transition);
    this._states.set(fromState, stateTransitions);
  }

  public addState(state: TState): void {
    if (this._states.has(state)) {
      throw new Error(
        `The state "${state.name}" already exists in the finite state machine.`,
      );
    }

    this._states.set(state, []);
  }

  public getCurrentState(): TState {
    return this._currentState;
  }

  public update(input: TInput): void {
    for (const transition of this._states.get(this._currentState) || []) {
      if (transition.satisfies(input)) {
        this._currentState = transition.toState;

        break;
      }
    }
  }
}
