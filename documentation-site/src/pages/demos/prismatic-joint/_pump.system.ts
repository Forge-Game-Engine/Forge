import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { positionId, Time } from '@forge-game-engine/forge/common';
import {
  Vector2,
  vector2Clone,
  vector2Negate,
} from '@forge-game-engine/forge/math';
import { applyImpulse, rigidBodyId } from '@forge-game-engine/forge/physics';
import { PumpEcsComponent, pumpId } from './_pump.component';

export const createPumpEcsSystem = (
  time: Time,
): EcsSystem<[PumpEcsComponent]> => ({
  query: [pumpId],
  update: (world, { components: [pumps] }) => {
    for (const pump of pumps) {
      pump.elapsedSeconds += time.deltaTimeInSeconds;

      if (pump.elapsedSeconds < pump.intervalSeconds) {
        continue;
      }

      pump.elapsedSeconds = 0;

      // clone: pump.impulse is a persistent PumpEcsComponent field, reused
      // every trigger.
      const impulse: Vector2 =
        pump.direction === 1
          ? pump.impulse
          : vector2Negate(vector2Clone(pump.impulse));

      const position = world.getComponent(pump.entity, positionId);
      const rigidBody = world.getComponent(pump.entity, rigidBodyId);

      if (position !== null && rigidBody !== null) {
        applyImpulse(impulse, position.world, position.world, rigidBody);
      }

      if (pump.alternate) {
        pump.direction = pump.direction === 1 ? -1 : 1;
      }
    }
  },
});
