import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  createImageSprite,
  RenderContext,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  CircleShape,
  PhysicsBodyId,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import { PlayerId } from './_player.component';
import { gunId } from './_gun.component';

export async function createPlayer(
  renderContext: RenderContext,
  world: EcsWorld,
  renderLayer: number,
): Promise<void> {
  const playerSprite = createImageSprite(
    await renderContext.imageCache.getOrLoad(
      getAssetUrl('img/space-shooter/Spaceship_6.png'),
    ),
    renderContext,
    renderLayer,
  );

  const bulletSprite = createImageSprite(
    await renderContext.imageCache.getOrLoad(
      getAssetUrl('img/space-shooter/bullet-yellow.png'),
    ),
    renderContext,
    renderLayer,
  );

  const playerEntity = world.createEntity();
  const playerX = 0;
  const playerY = -250;
  const playerScale = 0.15;

  world.addComponent(playerEntity, spriteId, playerSprite);
  world.addComponent(playerEntity, positionId, {
    local: new Vector2(playerX, playerY),
    world: new Vector2(playerX, playerY),
  });
  world.addComponent(playerEntity, PlayerId, {
    speed: 50,
    minX: -300,
    maxX: 300,
    minY: -270,
    maxY: 100,
  });

  world.addComponent(playerEntity, scaleId, {
    local: new Vector2(playerScale, playerScale),
    world: new Vector2(playerScale, playerScale),
  });

  world.addComponent(playerEntity, rotationId, {
    local: Math.PI,
    world: Math.PI,
  });

  world.addComponent(playerEntity, gunId, {
    timeBetweenShots: 0.2,
    bulletSprite: bulletSprite,
    renderLayer: renderLayer,
    nextAllowedShotTime: 0,
  });

  const playerRadius =
    (playerSprite.width * playerScale + playerSprite.height * playerScale) / 4;

  world.addComponent(playerEntity, PhysicsBodyId, {
    physicsBody: new RigidBody({
      shape: new CircleShape(playerRadius),
      position: new Vector2(playerX, playerY),
      isStatic: false,
      isSensor: true,
    }),
    isKinematic: true,
  });
}
