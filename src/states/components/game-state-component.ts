import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * The state of a {@link GameState}, on the game state's own entity.
 * `createGameState` creates the entity and the component, and the
 * `GameState` handle reads it.
 *
 * System-owned: `current`, `entered`, `exited` and `hasEntered` are written
 * only by the state's transition system. `next` is a request queue: the
 * handle's `set` writes it and the transition system consumes and clears
 * it. Change the state with `GameState.set`, never by writing this.
 *
 * @typeParam TName - The names of the states.
 */
export interface GameStateEcsComponent<TName extends string = string> {
  /** The current state. */
  current: TName;

  /** The state entered at the start of this tick, or `null`. */
  entered: TName | null;

  /** The state left at the start of this tick, or `null`. */
  exited: TName | null;

  /** The last state requested with `set` since the previous transition. */
  next: TName | null;

  /**
   * Whether the transition system has entered the initial state. It's
   * `false` until the system's first run, which enters `current`, and
   * again after the system's `cleanup`, so a state whose systems are
   * registered again enters its current state again.
   */
  hasEntered: boolean;
}

export const gameStateId =
  createComponentId<GameStateEcsComponent>('gameState');
