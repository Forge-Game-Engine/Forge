import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { createGameState } from '../game-state.js';
import {
  addStateScopedComponent,
  stateScopedId,
} from './state-scoped-component.js';

describe('addStateScopedComponent', () => {
  it('attaches a component with an empty list for the transitions not given', () => {
    const world = new EcsWorld();
    const state = createGameState(world, 'menu');
    const entity = world.createEntity();

    const component = addStateScopedComponent(world, entity, {
      state,
      removeOnExit: ['menu'],
    });

    expect(component).toEqual({
      state,
      removeOnExit: ['menu'],
      removeOnEnter: [],
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const state = createGameState(world, 'menu');
    const entity = world.createEntity();

    const component = addStateScopedComponent(world, entity, {
      state,
      removeOnEnter: ['menu'],
    });

    expect(world.getComponent(entity, stateScopedId)).toBe(component);
  });

  it('throws when neither list names a state', () => {
    const world = new EcsWorld();
    const state = createGameState(world, 'menu');
    const entity = world.createEntity();

    expect(() => addStateScopedComponent(world, entity, { state })).toThrow(
      /would never be removed/,
    );
  });
});
