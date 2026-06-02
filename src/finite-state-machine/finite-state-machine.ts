import { State } from './state.js';
import { Transition } from './transition.js';

type TransitionTuple<TInput, TState> = [Transition<TInput>, TState];

/**
 * A generic finite state machine (FSM) implementation.
 * TInput represents the type of input used to trigger state transitions.
 * TState represents the type of states managed by the FSM.
 */
export class FiniteStateMachine<TInput, TState extends State> {
  private _currentState: TState;
  private readonly _states: Map<TState, TransitionTuple<TInput, TState>[]>;

  /**
   * Creates an instance of FiniteStateMachine.
   *
   * @param states - The states to include in the FSM.
   * @param startingState - The initial state of the FSM. If not provided, the first state in the states array will be used.
   * @throws Will throw an error if no states are provided or if the starting state is not in the provided states.
   */
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

  /**
   * Adds a transition to the finite state machine.
   * @param fromState - The state to transition from.
   * @param toState - The state to transition to.
   * @param transition - The transition to add.
   * @throws Will throw an error if either the fromState or toState does not exist in the FSM.
   */
  public addTransition(
    fromState: TState,
    toState: TState,
    transition: Transition<TInput>,
  ): void {
    const fromStateTransitions = this._states.get(fromState);

    if (!fromStateTransitions) {
      throw new Error(
        `State with name "${fromState.name}" does not exist in the finite state machine.`,
      );
    }

    if (!this._states.has(toState)) {
      throw new Error(
        `State with name "${toState.name}" does not exist in the finite state machine.`,
      );
    }

    fromStateTransitions.push([transition, toState]);
    this._states.set(fromState, fromStateTransitions);
  }

  /**
   * Adds a new state to the finite state machine.
   * @param state - The state to add.
   * @throws Will throw an error if the state already exists in the FSM.
   */
  public addState(state: TState): void {
    if (this._states.has(state)) {
      throw new Error(
        `The state "${state.name}" already exists in the finite state machine.`,
      );
    }

    this._states.set(state, []);
  }

  /**
   * Gets the current state of the finite state machine.
   * @return The current state.
   */
  get currentState(): TState {
    return this._currentState;
  }

  /**
   * Updates the finite state machine based on the provided input.
   * @param input - The input used to evaluate transitions.
   * @return True if a state transition occurred; otherwise, false.
   */
  public update(input: TInput): boolean {
    for (const [transition, toState] of this._states.get(this._currentState)!) {
      if (transition.satisfies(input)) {
        this._currentState = toState;

        return true;
      }
    }

    return false;
  }
}
