import { createComponentId } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';

/**
 * A closed path an entity follows forever: its x and y each swing around
 * `center` on a sine wave, so equal speeds trace a circle and a y speed
 * twice the x speed traces a figure eight.
 */
export interface LoopingPathEcsComponent {
  /** The middle of the path, in world units. */
  center: Vector2;

  /** How far the entity swings from `center` along x and y, in world units. */
  radius: Vector2;

  /** How fast the x and y waves turn, in radians per second. */
  speed: Vector2;

  /** How far the x wave is ahead of the y wave, in radians. */
  phase: number;
}

export const loopingPathId =
  createComponentId<LoopingPathEcsComponent>('LoopingPath');
