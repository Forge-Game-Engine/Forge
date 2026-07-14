import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { lerp } from '@forge-game-engine/forge/math';
import { EasingRowEcsComponent, easingRowId } from './_easing-row.component';

const cycleSeconds = 3;

/**
 * Converts elapsed time into a [0, 1] phase that ramps up and back down once
 * per `cycleSeconds`, so a sprite driven by it sweeps forward then back.
 * @param elapsedSeconds - The total elapsed time, in seconds.
 * @returns The ping-pong phase, between 0 and 1.
 */
function pingPong(elapsedSeconds: number): number {
  const phase = (elapsedSeconds % cycleSeconds) / cycleSeconds;

  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

/**
 * Sweeps each easing row's sprite back and forth between `minX` and `maxX`,
 * applying its easing function to the current ping-pong phase every frame.
 * @param time - The time instance used to derive the ping-pong phase.
 * @returns The easing row ECS system.
 */
export const createEasingRowEcsSystem = (
  time: Time,
): EcsSystem<[PositionEcsComponent, EasingRowEcsComponent]> => ({
  query: [positionId, easingRowId],
  run: (result) => {
    const [position, easingRow] = result.components;
    const { easingFunction, minX, maxX } = easingRow;

    const phase = pingPong(time.timeInSeconds);

    position.world.x = lerp(minX, maxX, easingFunction(phase));
  },
});
