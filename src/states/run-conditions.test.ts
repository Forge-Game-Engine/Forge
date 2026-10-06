import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../ecs/index.js';
import { createGameState } from './game-state.js';
import { inState, onEnter, onExit } from './run-conditions.js';

type Name = 'menu' | 'playing' | 'gameOver';

describe('run conditions', () => {
  it('inState is true while the state is one of the names', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');

    expect(inState(state, 'menu')(world)).toBe(true);
    expect(inState(state, 'playing', 'gameOver')(world)).toBe(false);
  });

  it('onEnter is true only on the tick one of the names is entered', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const enteringPlay = onEnter(state, 'playing', 'gameOver');

    world.update();

    expect(onEnter(state, 'menu')(world)).toBe(true);
    expect(enteringPlay(world)).toBe(false);

    state.set('playing');
    world.update();

    expect(enteringPlay(world)).toBe(true);

    world.update();

    expect(enteringPlay(world)).toBe(false);
  });

  it('onExit is true only on the tick one of the names is left', () => {
    const world = new EcsWorld();
    const state = createGameState<Name>(world, 'menu');
    const leavingMenu = onExit(state, 'menu');

    world.update();

    expect(leavingMenu(world)).toBe(false);

    state.set('playing');
    world.update();

    expect(leavingMenu(world)).toBe(true);
    expect(onExit(state, 'playing')(world)).toBe(false);

    world.update();

    expect(leavingMenu(world)).toBe(false);
  });
});
