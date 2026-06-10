import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';
import { RenderContext } from '@forge-game-engine/forge/rendering';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';

export const createAsteroidEcsSystem = (
  time: Time,
  renderContext: RenderContext,
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

    const despawnY = -(renderContext.canvas.height / 2 + 100);

    if (positionComponent.world.y < despawnY) {
      world.removeEntity(result.entity);
    }
  },
});
