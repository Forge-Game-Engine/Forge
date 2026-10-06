/**
 * Collision categories for the space shooter. Asteroids only collide with
 * bullets and the player, so the broad phase never tests asteroids against
 * each other, or bullets against bullets or the player.
 */
export const asteroidCategory = 1 << 0;
export const bulletCategory = 1 << 1;
export const playerCategory = 1 << 2;
