import { EcsSystem } from '../../ecs/index.js';
import {
  StateScopedEcsComponent,
  stateScopedId,
} from '../components/state-scoped-component.js';
import { GameState } from '../game-state.js';

/**
 * Creates the system that removes the entities scoped to `state` when it
 * leaves one of their `removeOnExit` states or enters one of their
 * `removeOnEnter` states. `createGameState` registers it between the
 * state's `exitGroup` and `enterGroup`.
 * @param state - The game state whose scoped entities the system removes.
 * @returns The ECS system.
 */
export function createStateScopedRemovalEcsSystem<TName extends string>(
  state: GameState<TName>,
): EcsSystem<[StateScopedEcsComponent]> {
  return {
    name: 'state-scoped-removal',
    query: [stateScopedId],
    update: (world, { entities, components: [scopes] }): void => {
      const { entered, exited } = state;

      for (let i = 0; i < entities.length; i++) {
        const scope = scopes[i];

        if (scope.state !== state) {
          continue;
        }

        const removedOnExit =
          exited !== null && scope.removeOnExit.includes(exited);
        const removedOnEnter =
          entered !== null && scope.removeOnEnter.includes(entered);

        if (removedOnExit || removedOnEnter) {
          world.removeEntity(entities[i]);
        }
      }
    },
  };
}
