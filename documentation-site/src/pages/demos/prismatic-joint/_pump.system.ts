import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { positionId, Time } from '@forge-game-engine/forge/common';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import { applyImpulse } from '@forge-game-engine/forge/physics';
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
          : Vec2.negate(Vec2.clone(pump.impulse));

      const position = world.getComponent(pump.entity, positionId);

      if (position !== null) {
        applyImpulse(world, pump.entity, impulse, position.world);
      }

      if (pump.alternate) {
        pump.direction = pump.direction === 1 ? -1 : 1;
      }
    }
  },
});
