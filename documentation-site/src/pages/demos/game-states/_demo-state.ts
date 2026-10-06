import { GameState } from '@forge-game-engine/forge/states';

/**
 * The demo's top-level states. `menu` waits for the player, `playing` runs
 * a round, and `gameOver` shows the round's score over what it left behind.
 */
export type DemoStateName = 'menu' | 'playing' | 'gameOver';

export type DemoState = GameState<DemoStateName>;

/**
 * The current round's score, shared by the systems that play it and the
 * game-over screen that reports it. Reset when a round starts.
 */
export interface Round {
  score: number;
  misses: number;
  secondsUntilNextStar: number;
}

export const maxMisses = 3;
