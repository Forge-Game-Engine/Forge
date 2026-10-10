import { EcsSystem } from '../../ecs/index.js';
import { gameStateId } from '../components/game-state-component.js';

/**
 * Creates the system that applies a game state's requested transition. It
 * runs in the world's `firstSystemGroup`, so a transition happens before
 * any other system of the tick, and it's the only writer of the state's
 * `current`, `entered`, `exited` and `hasEntered`. `createGameState`
 * registers it.
 * @param stateEntity - The entity holding the state's
 * `GameStateEcsComponent`.
 * @returns The ECS system.
 */
export function createStateTransitionEcsSystem(
  stateEntity: number,
): EcsSystem<[]> {
  return {
    name: 'state-transition',
    query: [],
    update: (world): void => {
      const state = world.getComponentRequired(stateEntity, gameStateId);

      state.entered = null;
      state.exited = null;

      if (!state.hasEntered) {
        state.hasEntered = true;
        state.entered = state.current;

        return;
      }

      if (state.next === null) {
        return;
      }

      state.exited = state.current;
      state.entered = state.next;
      state.current = state.next;
      state.next = null;
    },
    cleanup: (world): void => {
      const state = world.getComponent(stateEntity, gameStateId);

      if (state) {
        state.hasEntered = false;
      }
    },
  };
}
