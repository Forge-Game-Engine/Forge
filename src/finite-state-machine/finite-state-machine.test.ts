import { describe, expect, it } from 'vitest';
import { FiniteStateMachine } from './finite-state-machine.js';
import type { State } from './state.js';
import { Transition } from './transition.js';

describe('FiniteStateMachine', () => {
  it('initial current state is entry', () => {
    const fsm = new FiniteStateMachine<number>();
    expect(fsm.getCurrentState()).toBe(fsm.entryState);
    expect(fsm.getCurrentState().name).toBe('entry');
  });

  it('update with no transitions does not change state', () => {
    const fsm = new FiniteStateMachine<number>();
    fsm.update(42);
    expect(fsm.getCurrentState()).toBe(fsm.entryState);
  });

  it('addTransition throws when adding from exit state', () => {
    const fsm = new FiniteStateMachine<number>();
    const dummyState: State<number> = { name: 'dummy', transitions: [] };

    const dummyTransition = new Transition<number>(dummyState, []);

    expect(() => fsm.addTransition(fsm.exitState, dummyTransition)).toThrow(
      'Cannot add transitions from the exit state.',
    );
  });

  it('update follows a matching transition to the target state', () => {
    const fsm = new FiniteStateMachine<number>();

    const target: State<number> = { name: 'target', transitions: [] };
    fsm.addState(target);

    const transition = new Transition<number>(target, [(input) => input === 1]);

    fsm.addTransition(fsm.entryState, transition);

    // before update still entry
    expect(fsm.getCurrentState()).toBe(fsm.entryState);

    // update with matching input moves to target
    fsm.update(1);
    expect(fsm.getCurrentState()).toBe(target);
  });

  it('only the first matching transition is used (order matters)', () => {
    const fsm = new FiniteStateMachine<number>();

    const s1: State<number> = { name: 's1', transitions: [] };
    const s2: State<number> = { name: 's2', transitions: [] };
    fsm.addState(s1);
    fsm.addState(s2);

    const t1 = new Transition<number>(s1, [(input) => input === 2]);

    const t2 = new Transition<number>(s2, [(input) => input === 2]);

    // add t1 first, then t2
    fsm.addTransition(fsm.entryState, t1);
    fsm.addTransition(fsm.entryState, t2);

    // input 2 should match t1 (first), so go to s1
    fsm.update(2);
    expect(fsm.getCurrentState()).toBe(s1);
  });

  it('throws error when adding the same state twice', () => {
    const fsm = new FiniteStateMachine<number>();

    const target: State<number> = { name: 'target', transitions: [] };
    fsm.addState(target);

    expect(() => fsm.addState(target)).toThrow(
      `State with name "target" already exists.`,
    );
  });
});
