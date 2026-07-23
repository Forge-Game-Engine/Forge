import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { positionId, rotationId } from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addAngularVelocityMotorComponent,
  CircleShape,
  PhysicsBodyId,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  createImageSprite,
  RenderContext,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export const ballRadius = 24;

/**
 * The maximum torque the ball's `AngularVelocityMotorEcsComponent` may
 * spend reaching its roll input's target angular velocity, tuned relative
 * to the ball's own moment of inertia so it ramps up to speed over a few
 * tenths of a second rather than snapping instantly or crawling.
 */
export const ballMaxTorque = 30_000_000;

export interface Player {
  /** The entity carrying the ball's sprite, position and physics body. */
  entity: number;

  /** The ball's `RigidBody`, for grounded checks and jump impulses. */
  body: RigidBody;
}

/**
 * Creates the player-controlled ball: a dynamic `CircleShape` body with an
 * `AngularVelocityMotorEcsComponent` (driven by roll input, see
 * `createRollEcsSystem`) that lets friction against the terrain turn spin
 * into rolling motion, exactly like a real ball.
 * @param world - The ECS world to add the ball entity to.
 * @param renderContext - The render context used to load the ball sprite.
 * @param renderLayer - The render layer the ball should be drawn on.
 * @param spawnPosition - The world-space position to spawn the ball at.
 */
export async function createPlayer(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  spawnPosition: Vector2,
): Promise<Player> {
  const ballImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/physics/ball_blue_large.png'),
  );
  const ballSprite = createImageSprite(ballImage, renderContext, renderLayer);

  const ballBody = new RigidBody({
    shape: new CircleShape(ballRadius),
    position: spawnPosition.clone(),
    density: 1.2,
    friction: 0.9,
    restitution: 0.15,
  });

  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    world: spawnPosition.clone(),
    local: spawnPosition.clone(),
  });

  world.addComponent(entity, rotationId, { local: 0, world: 0 });

  world.addComponent(entity, spriteId, {
    ...ballSprite,
    width: ballRadius * 2,
    height: ballRadius * 2,
  });

  world.addComponent(entity, PhysicsBodyId, { physicsBody: ballBody });

  addAngularVelocityMotorComponent(world, entity, {
    targetVelocity: 0,
    maxTorque: ballMaxTorque,
  });

  return { entity, body: ballBody };
}
