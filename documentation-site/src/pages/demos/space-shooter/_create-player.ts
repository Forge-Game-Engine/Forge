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
import { PlayerId } from './_player.component';
import { gunId } from './_gun.component';

export async function createPlayer(
  renderContext: RenderContext,
  world: EcsWorld,
  renderLayer: number,
): Promise<void> {
  const playerSprite = await createImageSprite(
    getAssetUrl('img/space-shooter/Spaceship_6.png'),
    renderContext,
    renderLayer,
  );

  const bulletSprite = await createImageSprite(
    getAssetUrl('img/space-shooter/bullet-yellow.png'),
    renderContext,
    renderLayer,
  );

  const playerEntity = world.createEntity();

  world.addComponent(playerEntity, spriteId, {
    sprite: playerSprite,
    enabled: true,
  });
  world.addComponent(playerEntity, positionId, {
    local: new Vector2(0, 250),
    world: new Vector2(0, 250),
  });
  world.addComponent(playerEntity, PlayerId, {
    speed: 50,
    minX: -300,
    maxX: 300,
    minY: -100,
    maxY: 270,
  });

  world.addComponent(playerEntity, scaleId, {
    local: new Vector2(0.15, 0.15),
    world: new Vector2(0.15, 0.15),
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
}
