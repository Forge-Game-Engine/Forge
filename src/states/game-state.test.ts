import { describe, expect, it } from 'vitest';
import { createSystemGroup, EcsSystem, EcsWorld } from '../ecs/index.js';
import { gameStateId } from './components/game-state-component.js';
import {
  addStateScopedComponent,
  stateScopedId,
} from './components/state-scoped-component.js';
import { createGameState, GameState } from './game-state.js';
import { inState, onEnter, onExit } from './run-conditions.js';

type Name = 'menu' | 'playing' | 'gameOver';

const recordingSystem = (
  calls: string[],
  record: () => string,
): EcsSystem<[]> => ({
  query: [],
  update: () => {
    calls.push(record());
  },
});

const snapshot = (
  state: GameState<Name>,
): { current: Name; entered: Name | null; exited: Name | null } => ({
  current: state.current,
  entered: state.entered,
  exited: state.exited,
});

const scopedEntities = (world: EcsWorld): readonly number[] =>
  world.query([stateScopedId]).entities;

describe('createGameState', () => {
  it('starts in the initial state', () => {
    const state = createGameState<Name>(new EcsWorld(), 'menu');

    expect(snapshot(state)).toEqual({
      current: 'menu',
      entered: null,
      exited: null,
    });
  });

  it('enters the initial state on the first tick', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');

    world.update();

    expect(snapshot(state)).toEqual({
      current: 'menu',
      entered: 'menu',
      exited: null,
    });
  });

  it('applies a requested transition at the start of the next tick, not immediately', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');

    world.update();
    state.set('playing');

    expect(state.current).toBe('menu');

    world.update();

    expect(snapshot(state)).toEqual({
      current: 'playing',
      entered: 'playing',
      exited: 'menu',
    });
  });

  it('reports entered and exited for exactly one tick', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');

    world.update();
    state.set('playing');
    world.update();
    world.update();

    expect(snapshot(state)).toEqual({
      current: 'playing',
      entered: null,
      exited: null,
    });
  });

  it('applies the last request when several are made in one tick', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');

    world.update();
    state.set('playing');
    state.set('gameOver');
    world.update();

    expect(snapshot(state)).toEqual({
      current: 'gameOver',
      entered: 'gameOver',
      exited: 'menu',
    });
  });

  it('re-enters the current state when it is requested', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'playing');
    const calls: string[] = [];

    world.addSystem(
      recordingSystem(calls, () => 'exit'),
      { group: state.exitGroup, runIf: onExit(state, 'playing') },
    );
    world.addSystem(
      recordingSystem(calls, () => 'enter'),
      { group: state.enterGroup, runIf: onEnter(state, 'playing') },
    );

    world.update();
    state.set('playing');
    world.update();

    expect(calls).toEqual(['enter', 'exit', 'enter']);
    expect(snapshot(state)).toEqual({
      current: 'playing',
      entered: 'playing',
      exited: 'playing',
    });
  });

  it('applies a transition before every system of the tick, including groups ordered before the default group', () => {
    const world = new EcsWorld();
    const early = createSystemGroup('early');

    world.addSystemGroup(early, { before: [world.defaultSystemGroup] });

    const state = createGameState<Name>(world, 'menu');
    const calls: string[] = [];

    world.addSystem(
      recordingSystem(calls, () => `early sees ${state.current}`),
      { group: early },
    );
    world.addSystem(
      recordingSystem(calls, () => {
        state.set('playing');

        return `default sees ${state.current}`;
      }),
    );

    world.update();
    world.update();

    expect(calls).toEqual([
      'early sees menu',
      'default sees menu',
      'early sees playing',
      'default sees playing',
    ]);
  });

  it('runs exit systems, then scoped removal, then enter systems, before every other group', () => {
    const world = new EcsWorld();
    const early = createSystemGroup('early');

    // Added before the state, so only the state's groups running at the
    // start of the tick keeps this group after them.
    world.addSystemGroup(early, { before: [world.defaultSystemGroup] });

    const state = createGameState<Name>(world, 'menu');
    const calls: string[] = [];
    const scoped = world.createEntity();

    addStateScopedComponent(world, scoped, {
      state,
      removeOnExit: ['menu'],
    });

    const scopedLabel = (): string =>
      scopedEntities(world).includes(scoped) ? 'present' : 'removed';

    world.addSystem(
      recordingSystem(calls, () => `gameplay sees ${state.current}`),
      { group: early, runIf: onEnter(state, 'playing') },
    );
    world.addSystem(
      recordingSystem(calls, () => `exit, scoped ${scopedLabel()}`),
      { group: state.exitGroup, runIf: onExit(state, 'menu') },
    );
    world.addSystem(
      recordingSystem(calls, () => `enter, scoped ${scopedLabel()}`),
      { group: state.enterGroup, runIf: onEnter(state, 'playing') },
    );

    world.update();
    state.set('playing');
    world.update();

    expect(calls).toEqual([
      'exit, scoped present',
      'enter, scoped removed',
      'gameplay sees playing',
    ]);
  });

  it('runs onEnter systems for the initial state on the first tick', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const calls: string[] = [];

    world.addSystem(
      recordingSystem(calls, () => 'enter menu'),
      { group: state.enterGroup, runIf: onEnter(state, 'menu') },
    );
    world.addSystem(
      recordingSystem(calls, () => 'exit'),
      { group: state.exitGroup, runIf: onExit(state, 'menu') },
    );

    world.update();
    world.update();

    expect(calls).toEqual(['enter menu']);
  });

  it('runs systems only in the states inState names', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const calls: string[] = [];

    world.addSystem(
      recordingSystem(calls, () => 'menu'),
      { runIf: inState(state, 'menu') },
    );
    world.addSystem(
      recordingSystem(calls, () => 'in game'),
      { runIf: inState(state, 'playing', 'gameOver') },
    );

    world.update();
    state.set('playing');
    world.update();
    state.set('gameOver');
    world.update();

    expect(calls).toEqual(['menu', 'in game', 'in game']);
  });

  it('removes entities scoped to a state when it is left', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const entity = world.createEntity();

    addStateScopedComponent(world, entity, {
      state,
      removeOnExit: ['menu'],
    });

    world.update();

    expect(scopedEntities(world)).toContain(entity);

    state.set('playing');
    world.update();

    expect(scopedEntities(world)).not.toContain(entity);
  });

  it('removes entities scoped to a state when it is entered', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'playing');
    const entity = world.createEntity();

    world.update();

    addStateScopedComponent(world, entity, {
      state,
      removeOnEnter: ['playing', 'menu'],
    });

    state.set('gameOver');
    world.update();

    expect(scopedEntities(world)).toContain(entity);

    state.set('menu');
    world.update();

    expect(scopedEntities(world)).not.toContain(entity);
  });

  it('removes an entity scoped to the initial state on enter on the first tick', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const entity = world.createEntity();

    addStateScopedComponent(world, entity, {
      state,
      removeOnEnter: ['menu'],
    });

    world.update();

    expect(scopedEntities(world)).not.toContain(entity);
  });

  it('leaves entities scoped to another game state alone', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const otherState = createGameState<Name>(world, 'menu');
    const entity = world.createEntity();

    addStateScopedComponent(world, entity, {
      state: otherState,
      removeOnExit: ['menu'],
    });

    world.update();
    state.set('playing');
    world.update();

    expect(scopedEntities(world)).toContain(entity);

    otherState.set('playing');
    world.update();

    expect(scopedEntities(world)).not.toContain(entity);
  });

  it('runs no exit, removal or enter systems on ticks without a transition', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const calls: string[] = [];

    world.addSystem(
      recordingSystem(calls, () => 'exit'),
      { group: state.exitGroup },
    );
    world.addSystem(
      recordingSystem(calls, () => 'enter'),
      { group: state.enterGroup },
    );

    world.update();
    calls.length = 0;
    world.update();

    expect(calls).toEqual([]);
  });

  it("keeps the state in a GameStateEcsComponent on the state's own entity", () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');

    world.update();
    state.set('playing');
    world.update();

    expect(world.getComponent(state.entity, gameStateId)).toEqual({
      current: 'playing',
      entered: 'playing',
      exited: 'menu',
      next: null,
      hasEntered: true,
    });
  });

  it('sets hasEntered only when the transition system runs', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const component = world.getComponentRequired(state.entity, gameStateId);

    state.set('playing');

    expect(component.hasEntered).toBe(false);

    world.update();

    expect(component.hasEntered).toBe(true);
  });

  it('enters the current state again on the first tick after its systems are cleaned up', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const entered: (Name | null)[] = [];

    world.addSystem(
      recordingSystem([], () => {
        entered.push(state.entered);

        return '';
      }),
    );

    world.update();
    world.update();
    world.stop();
    world.update();

    expect(entered).toEqual(['menu', null, 'menu']);
  });
});
