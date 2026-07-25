import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';

const despawnY = -(DEMO_VERTICAL_WORLD_UNITS / 2 + 100);

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
