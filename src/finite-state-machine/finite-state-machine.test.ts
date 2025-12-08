import { describe, expect, it } from 'vitest';
import { FiniteStateMachine } from './finite-state-machine.js';
import type { State } from './state.js';
import { Transition } from './transition.js';

describe('FiniteStateMachine', () => {
  it('update with no transitions does not change state', () => {
    const fsm = new FiniteStateMachine<number, State>([
      { name: 'entry' },
      { name: 'exit' },
    ]);
    fsm.update(42);
    expect(fsm.getCurrentState().name).toBe('entry');
  });

  it('update follows a matching transition to the target state', () => {
    const entry: State = { name: 'entry' };
    const target: State = { name: 'target' };
    const exit: State = { name: 'exit' };

    const fsm = new FiniteStateMachine<number, State>([entry, target, exit]);

    const transition = new Transition<number, State>(target, [
      (input) => input === 1,
    ]);

    fsm.addTransition(entry, transition);

    // before update still entry
    expect(fsm.getCurrentState()).toBe(entry);

    // update with matching input moves to target
    fsm.update(1);
    expect(fsm.getCurrentState()).toBe(target);
  });

  it('only the first matching transition is used (order matters)', () => {
    const entry: State = { name: 'entry' };
    const s1: State = { name: 's1' };
    const s2: State = { name: 's2' };

    const fsm = new FiniteStateMachine<number, State>([entry, s1, s2]);

    const t1 = new Transition<number, State>(s1, [(input) => input === 2]);
    const t2 = new Transition<number, State>(s2, [(input) => input === 2]);

    // add t1 first, then t2
    fsm.addTransition(entry, t1);
    fsm.addTransition(entry, t2);

    // input 2 should match t1 (first), so go to s1
    fsm.update(2);
    expect(fsm.getCurrentState()).toBe(s1);
  });

  it('throws error when adding the same state twice', () => {
    const fsm = new FiniteStateMachine<number, State>([{ name: 'target' }]);

    const target: State = { name: 'target' };
    fsm.addState(target);

    expect(() => fsm.addState(target)).toThrow(
      `The state "target" already exists in the finite state machine.`,
    );
  });

  it('constructor throws when initialized with no states', () => {
    expect(() => new FiniteStateMachine<number, State>([])).toThrow(
      'FiniteStateMachine must be initialized with at least one state.',
    );
  });

  it('constructor throws when starting state is not in provided states', () => {
    const a: State = { name: 'a' };
    const b: State = { name: 'b' };
    expect(() => new FiniteStateMachine<number, State>([a], b)).toThrow(
      'Starting state must be one of the provided states.',
    );
  });

  it('uses provided starting state when given', () => {
    const entry: State = { name: 'entry' };
    const target: State = { name: 'target' };
    const fsm = new FiniteStateMachine<number, State>([entry, target], target);
    expect(fsm.getCurrentState()).toBe(target);
  });

  it('addTransition throws when fromState does not exist in the machine', () => {
    const entry: State = { name: 'entry' };
    const unknown: State = { name: 'unknown' };
    const fsm = new FiniteStateMachine<number, State>([entry]);

    const t = new Transition<number, State>(entry, [() => true]);

    expect(() => fsm.addTransition(unknown, t)).toThrow(
      `State with name "unknown" does not exist in the finite state machine.`,
    );
  });
});
