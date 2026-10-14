import {
  PositionEcsComponent,
  positionId,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { vectorToRadians } from '@forge-game-engine/forge/math';
import {
  LoopingPathEcsComponent,
  loopingPathId,
} from './_looping-path.component';

/**
 * Moves every entity with a looping path to where its path is at the
 * current game time, and turns the ones that have a rotation to face the
 * way they're moving. It works the position out from the time alone, so it
 * keeps nothing between frames.
 * @param time - The game time the paths follow.
 * @returns The ECS system.
 */
export const createLoopingPathEcsSystem = (
  time: Time,
): EcsSystem<[LoopingPathEcsComponent, PositionEcsComponent]> => ({
  query: [loopingPathId, positionId],
  update: (world, { entities, components: [paths, positions] }) => {
    const getRotation = world.getComponentAccessor(rotationId);
    const t = time.timeInSeconds;

    for (let i = 0; i < entities.length; i++) {
      const { center, radius, speed, phase } = paths[i];
      const position = positions[i];

      position.local.x = center.x + radius.x * Math.sin(speed.x * t + phase);
      position.local.y = center.y + radius.y * Math.sin(speed.y * t);

      const rotation = getRotation(entities[i]);

      if (!rotation) {
        continue;
      }

      // The path's velocity: the derivative of the position above.
      rotation.local = vectorToRadians({
        x: radius.x * speed.x * Math.cos(speed.x * t + phase),
        y: radius.y * speed.y * Math.cos(speed.y * t),
      });
    }
  },
});
