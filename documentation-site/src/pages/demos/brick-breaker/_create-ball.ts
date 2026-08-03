import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import {
  createVector2,
  degreesToRadians,
  Random,
  Vector2,
  vector2Clone,
  vector2Multiply,
} from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addRigidBodyComponent,
  CircleCollider,
  RigidBodyEcsComponent,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
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
 * @param rigidBody - The ball's rigid body component.
 * @param speed - The launch speed, in pixels per second.
 * @param random - The random source used to vary the launch angle.
 */
export function launchBall(
  rigidBody: RigidBodyEcsComponent,
  speed: number,
  random: Random,
): void {
  const angle = degreesToRadians(
    random.randomFloat(-launchAngleRangeInDegrees, launchAngleRangeInDegrees),
  );

  rigidBody.velocity = vector2Multiply(
    createVector2(Math.sin(angle), Math.cos(angle)),
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

  addPositionComponent(world, entity, {
    local: vector2Clone(startPosition),
    world: vector2Clone(startPosition),
  });

  addRotationComponent(world, entity);

  addScaleComponent(world, entity, {
    local: createVector2(ballScale, ballScale),
    world: createVector2(ballScale, ballScale),
  });

  addSpriteComponent(world, entity, ballSprite);

  world.addComponent(entity, ballId, {
    speed,
    startPosition: vector2Clone(startPosition),
  });

  const collider = new CircleCollider(ballRadius);

  addColliderComponent(world, entity, {
    collider,
    restitution: 1,
    friction: 0,
  });
  addAabbComponent(world, entity);

  const rigidBody = addRigidBodyComponent(world, entity, {
    mass: collider.mass,
    momentOfInertia: collider.momentOfInertia,
  });

  launchBall(rigidBody, speed, random);
}
