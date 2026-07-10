import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import {
  degreesToRadians,
  Random,
  Vector2,
} from '@forge-game-engine/forge/math';
import {
  CircleShape,
  PhysicsBodyId,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  createImageSprite,
  RenderContext,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { ballId } from './_ball.component';

const ballDiameterFraction = 0.02;
const ballSpeedFraction = 0.25;
const launchAngleRangeInDegrees = 35;

/**
 * Sets the ball's velocity to a launch direction that is mostly towards the
 * bricks with some left/right variance, so repeated launches don't always
 * retrace the same path.
 *
 * Positive Y is towards the top of the play area (where the bricks are),
 * matching the world-space convention used by `PositionEcsComponent`, which
 * is the opposite of `Vector2.up`'s screen-space convention.
 * @param physicsBody - The ball's rigid body.
 * @param speed - The launch speed, in pixels per second.
 * @param random - The random source used to vary the launch angle.
 */
export function launchBall(
  physicsBody: RigidBody,
  speed: number,
  random: Random,
): void {
  const angle = degreesToRadians(
    random.randomFloat(-launchAngleRangeInDegrees, launchAngleRangeInDegrees),
  );

  physicsBody.velocity = new Vector2(Math.sin(angle), Math.cos(angle)).multiply(
    speed,
  );
}

/**
 * Creates the ball as a dynamic rigid body and launches it towards the
 * bricks.
 * @param world - The ECS world to add the ball entity to.
 * @param renderContext - The render context used to load the ball sprite.
 * @param renderLayer - The render layer the ball should be drawn on.
 * @param startPosition - The position the ball starts at, and resets to
 * whenever it falls out of play.
 * @param playAreaWidth - The width of the play area, used to size and pace
 * the ball relative to it.
 * @param random - The random source used to vary the launch angle.
 */
export async function createBall(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  startPosition: Vector2,
  playAreaWidth: number,
  random: Random,
): Promise<void> {
  const ballImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/brick-breaker/ball.png'),
  );
  const ballSprite = createImageSprite(ballImage, renderContext, renderLayer);

  const ballDiameter = playAreaWidth * ballDiameterFraction;
  const ballScale = ballDiameter / ballSprite.width;
  const ballRadius = ballDiameter / 2;
  const speed = playAreaWidth * ballSpeedFraction;

  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    local: startPosition.clone(),
    world: startPosition.clone(),
  });

  world.addComponent(entity, rotationId, { local: 0, world: 0 });

  world.addComponent(entity, scaleId, {
    local: new Vector2(ballScale, ballScale),
    world: new Vector2(ballScale, ballScale),
  });

  world.addComponent(entity, spriteId, ballSprite);

  world.addComponent(entity, ballId, {
    speed,
    startPosition: startPosition.clone(),
  });

  const physicsBody = new RigidBody({
    shape: new CircleShape(ballRadius),
    position: startPosition.clone(),
    restitution: 1,
    friction: 0,
  });

  launchBall(physicsBody, speed, random);

  world.addComponent(entity, PhysicsBodyId, { physicsBody });
}
