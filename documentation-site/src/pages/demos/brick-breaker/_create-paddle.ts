import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  PhysicsBodyId,
  PolygonShape,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  createImageSprite,
  RenderContext,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { PlayArea } from './_create-boundaries';
import { paddleId } from './_paddle.component';

const paddleWidthFraction = 0.12;
const paddleHeightFraction = 0.07;
const paddleSpeed = 1_000;
const paddleHeightAboveBottom = 60;

/**
 * Creates the player-controlled paddle as a static rigid body - immovable
 * under collision, but still driven by the paddle system's ECS position
 * writes each frame.
 * @param world - The ECS world to add the paddle entity to.
 * @param renderContext - The render context used to load the paddle sprite.
 * @param renderLayer - The render layer the paddle should be drawn on.
 * @param playArea - The bounds the paddle is constrained to move within.
 * @returns The paddle's starting position.
 */
export async function createPaddle(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  playArea: PlayArea,
): Promise<Vector2> {
  const paddleImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/brick-breaker/paddle.png'),
  );
  const paddleSprite = createImageSprite(
    paddleImage,
    renderContext,
    renderLayer,
  );

  const playAreaWidth = playArea.maxX - playArea.minX;
  const paddleWidth = playAreaWidth * paddleWidthFraction;
  const paddleScaleX = paddleWidth / paddleSprite.width;
  const paddleScaleY =
    (playAreaWidth * paddleHeightFraction) / paddleSprite.width;
  const paddleHeight = paddleSprite.height * paddleScaleY;

  const position = new Vector2(0, playArea.bottomY + paddleHeightAboveBottom);

  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    local: position.clone(),
    world: position.clone(),
  });

  world.addComponent(entity, rotationId, { local: 0, world: 0 });

  world.addComponent(entity, scaleId, {
    local: new Vector2(paddleScaleX, paddleScaleY),
    world: new Vector2(paddleScaleX, paddleScaleY),
  });

  world.addComponent(entity, spriteId, paddleSprite);

  world.addComponent(entity, paddleId, {
    speed: paddleSpeed,
    minX: playArea.minX + paddleWidth / 2,
    maxX: playArea.maxX - paddleWidth / 2,
  });

  world.addComponent(entity, PhysicsBodyId, {
    physicsBody: new RigidBody({
      shape: PolygonShape.rectangle(paddleWidth, paddleHeight),
      position: position.clone(),
      isStatic: true,
      restitution: 1,
      friction: 0,
    }),
  });

  return position;
}
