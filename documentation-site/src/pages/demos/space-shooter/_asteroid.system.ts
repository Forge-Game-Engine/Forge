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
  update: (
    world,
    {
      entities,
      components: [asteroidComponents, positionComponents, rotationComponents],
    },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const asteroidComponent = asteroidComponents[i];
      const positionComponent = positionComponents[i];
      const rotationComponent = rotationComponents[i];

      positionComponent.world.y -=
        asteroidComponent.speed * time.deltaTimeInSeconds;

      rotationComponent.world +=
        asteroidComponent.rotationSpeed * time.deltaTimeInSeconds;

      if (positionComponent.world.y < despawnY) {
        world.removeEntity(entity);
      }
    }
  },
});
