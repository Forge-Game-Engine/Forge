import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  ScaleEcsComponent,
  scaleId,
} from '@forge-game-engine/forge/common';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';
import { bulletId } from './_bullet.component';
import { PlayerId } from './_player.component';

interface CollisionQueryResult {
  bulletEntities: number[];
  playerEntity: number | null;
}

const bulletEntityBuffer: number[] = [];
const playerEntityBuffer: number[] = [];

function getCollisionRadius(
  sprite: SpriteEcsComponent,
  scale: ScaleEcsComponent,
): number {
  return (sprite.width * scale.world.x + sprite.height * scale.world.y) / 4;
}

function isCollidingWithEntity(
  world: EcsWorld,
  position: PositionEcsComponent,
  radius: number,
  otherEntity: number,
): boolean {
  const otherPosition = world.getComponent(otherEntity, positionId);
  const otherSprite = world.getComponent(otherEntity, spriteId);
  const otherScale = world.getComponent(otherEntity, scaleId);

  if (!otherPosition || !otherSprite || !otherScale) {
    return false;
  }

  const otherRadius = getCollisionRadius(otherSprite, otherScale);

  return position.world.distanceTo(otherPosition.world) < radius + otherRadius;
}

export const createAsteroidCollisionEcsSystem = (): EcsSystem<
  [
    AsteroidEcsComponent,
    PositionEcsComponent,
    SpriteEcsComponent,
    ScaleEcsComponent,
  ],
  CollisionQueryResult
> => ({
  query: [asteroidId, positionId, spriteId, scaleId],
  beforeQuery: (world) => {
    world.queryEntities(
      [bulletId, positionId, spriteId, scaleId],
      bulletEntityBuffer,
    );
    world.queryEntities(
      [PlayerId, positionId, spriteId, scaleId],
      playerEntityBuffer,
    );

    return {
      bulletEntities: [...bulletEntityBuffer],
      playerEntity: playerEntityBuffer[0] ?? null,
    };
  },
  run: (result, world, { bulletEntities, playerEntity }) => {
    const [, asteroidPosition, asteroidSprite, asteroidScale] =
      result.components;

    const asteroidRadius = getCollisionRadius(asteroidSprite, asteroidScale);

    for (const bulletEntity of bulletEntities) {
      if (
        isCollidingWithEntity(
          world,
          asteroidPosition,
          asteroidRadius,
          bulletEntity,
        )
      ) {
        world.removeEntity(result.entity);
        world.removeEntity(bulletEntity);

        return;
      }
    }

    if (
      playerEntity !== null &&
      isCollidingWithEntity(
        world,
        asteroidPosition,
        asteroidRadius,
        playerEntity,
      )
    ) {
      world.removeEntity(playerEntity);
    }
  },
});
