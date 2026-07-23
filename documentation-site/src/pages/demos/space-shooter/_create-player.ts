import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addPhysicsBodyComponent,
  CircleShape,
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

  // bullet-yellow.png is a solid, opaque comet shape (its own alpha
  // channel no longer fades to near-zero across the visible glow, which
  // would otherwise get crushed by normal alpha blending regardless of how
  // bright its color is). bullet_emission.png is a plain greyscale mask of
  // that same shape - color comes from `color` below, not the texture -
  // so createBloomEcsSystem's blur turns it into a soft, evenly-colored
  // glow, and raising BloomEcsComponent.threshold cleanly isolates the
  // bullets from every other (non-emissive) sprite in the scene (see the
  // "Emissive-driven bloom" and "Authoring an emissive map" sections of
  // the Bloom docs).
  const bulletImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/space-shooter/bullet-yellow.png'),
  );

  const bulletEmission = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/space-shooter/bullet_emission.png'),
  );

  const bulletSprite = createImageSprite(
    bulletImage,
    renderContext,
    renderLayer,
    {
      emissiveMap: {
        image: bulletEmission,
        color: new Color(1, 0.65, 0.15),
        intensity: 2,
      },
    },
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

  addSpriteComponent(world, playerEntity, playerSprite);
  addPositionComponent(world, playerEntity, {
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

  addScaleComponent(world, playerEntity, {
    local: new Vector2(playerScale, playerScale),
    world: new Vector2(playerScale, playerScale),
  });

  addRotationComponent(world, playerEntity, {
    local: Math.PI,
    world: Math.PI,
  });

  world.addComponent(playerEntity, gunId, {
    timeBetweenShots: 0.1,
    bulletSprite: bulletSprite,
    renderLayer: renderLayer,
    nextAllowedShotTime: 0,
  });

  addPhysicsBodyComponent(world, playerEntity, {
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
