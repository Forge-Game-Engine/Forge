import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import { PumpEcsComponent, pumpId } from './_pump.component';

export const createPumpEcsSystem = (
  time: Time,
): EcsSystem<[PumpEcsComponent]> => ({
  query: [pumpId],
  run: (result) => {
    const [pump] = result.components;

    pump.elapsedSeconds += time.deltaTimeInSeconds;

    if (pump.elapsedSeconds < pump.intervalSeconds) {
      return;
    }

    pump.elapsedSeconds = 0;

    const impulse: Vector2 =
      pump.direction === 1 ? pump.impulse : pump.impulse.negate();

    pump.joint.bodyB.applyImpulse(impulse, Vector2.zero);

    if (pump.alternate) {
      pump.direction = pump.direction === 1 ? -1 : 1;
    }
  },
});
