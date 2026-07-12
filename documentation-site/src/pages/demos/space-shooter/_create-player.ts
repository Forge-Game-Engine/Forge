import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
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

export interface PlayerSprites {
  playerSprite: SpriteEcsComponent;
  bulletSprite: SpriteEcsComponent;
}

/**
 * Loads the player's sprites once, so they can be reused every time
 * {@link spawnPlayer} creates a new player entity (e.g. on respawn), instead
 * of re-uploading GPU textures each time.
 */
export async function loadPlayerSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<PlayerSprites> {
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

  return { playerSprite, bulletSprite };
}

/**
 * Creates the player entity using already-loaded sprites.
 */
export function spawnPlayer(
  renderContext: RenderContext,
  world: EcsWorld,
  renderLayer: number,
  playerSprites: PlayerSprites,
): void {
  const { playerSprite, bulletSprite } = playerSprites;

  const playerEntity = world.createEntity();
  const playerX = 0;
  const playerY = -250;
  const playerScale = 0.15;

  const playerRadius =
    (playerSprite.width * playerScale + playerSprite.height * playerScale) / 4;

  const halfCanvasWidth = renderContext.canvas.width / 2;
  const halfCanvasHeight = renderContext.canvas.height / 2;

  world.addComponent(playerEntity, spriteId, playerSprite);
  world.addComponent(playerEntity, positionId, {
    local: new Vector2(playerX, playerY),
    world: new Vector2(playerX, playerY),
  });
  world.addComponent(playerEntity, PlayerId, {
    speed: 50,
    minX: -halfCanvasWidth + playerRadius,
    maxX: halfCanvasWidth - playerRadius,
    minY: -halfCanvasHeight + playerRadius,
    maxY: halfCanvasHeight - playerRadius,
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

export async function createPlayer(
  renderContext: RenderContext,
  world: EcsWorld,
  renderLayer: number,
): Promise<PlayerSprites> {
  const playerSprites = await loadPlayerSprites(renderContext, renderLayer);

  spawnPlayer(renderContext, world, renderLayer, playerSprites);

  return playerSprites;
}
