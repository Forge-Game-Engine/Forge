import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TriggerAction } from '@forge-game-engine/forge/input';
import { DemoState } from './_demo-state';

/**
 * Starts a round from the menu. Registered with `inState(state, 'menu')`.
 */
export const createMenuInputEcsSystem = (
  state: DemoState,
  playInput: TriggerAction,
): EcsSystem<[]> => ({
  name: 'menu-input',
  query: [],
  update: () => {
    if (playInput.isTriggered) {
      state.set('playing');
    }
  },
});

/**
 * Plays again or goes back to the menu from the game-over screen.
 * Registered with `inState(state, 'gameOver')`.
 */
export const createGameOverInputEcsSystem = (
  state: DemoState,
  playInput: TriggerAction,
  menuInput: TriggerAction,
): EcsSystem<[]> => ({
  name: 'game-over-input',
  query: [],
  update: () => {
    if (playInput.isTriggered) {
      state.set('playing');
    }

    if (menuInput.isTriggered) {
      state.set('menu');
    }
  },
});
