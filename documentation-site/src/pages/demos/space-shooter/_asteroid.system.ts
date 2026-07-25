import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';

// The demo is designed for a fixed 1920x1080 canvas.
const despawnY = -(1080 / 2 + 100);

export const createAsteroidEcsSystem = (
  time: Time,
): EcsSystem<
  [AsteroidEcsComponent, PositionEcsComponent, RotationEcsComponent]
> => ({
  query: [asteroidId, positionId, rotationId],
  run: (result, world) => {
    const [asteroidComponent, positionComponent, rotationComponent] =
      result.components;

    positionComponent.world.y -=
      asteroidComponent.speed * time.deltaTimeInSeconds;

    rotationComponent.world +=
      asteroidComponent.rotationSpeed * time.deltaTimeInSeconds;

    if (positionComponent.world.y < despawnY) {
      world.removeEntity(result.entity);
    }
  },
});
