import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addAngularVelocityMotorComponent,
  addColliderComponent,
  addGravityComponent,
  addRigidBodyComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
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
  /** The entity carrying the ball's sprite, position and physics components. */
  entity: number;
}

/**
 * Creates the player-controlled ball: a dynamic `CircleCollider` body with
 * an `AngularVelocityMotorEcsComponent` (driven by roll input, see
 * `createRollEcsSystem`) that lets friction against the terrain turn spin
 * into rolling motion, exactly like a real ball.
 * @param world - The ECS world to add the ball entity to.
 * @param renderContext - The render context used to load the ball sprite.
 * @param renderLayer - The render layer the ball should be drawn on.
 * @param spawnPosition - The world-space position to spawn the ball at.
 * @param gravity - The gravity vector applied to the ball.
 */
export async function createPlayer(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  spawnPosition: Vector2,
  gravity: Vector2,
): Promise<Player> {
  const ballImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/physics/ball_blue_large.png'),
  );
  const ballSprite = createImageSprite(ballImage, renderContext, renderLayer);

  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: Vec2.clone(spawnPosition),
    local: Vec2.clone(spawnPosition),
  });

  addRotationComponent(world, entity);

  addSpriteComponent(world, entity, {
    ...ballSprite,
    width: ballRadius * 2,
    height: ballRadius * 2,
  });

  const collider = new CircleCollider(ballRadius, 1.2);

  addColliderComponent(world, entity, {
    collider,
    friction: 0.9,
    restitution: 0.15,
  });
  addAabbComponent(world, entity);
  addRigidBodyComponent(world, entity, {
    mass: collider.mass,
    momentOfInertia: collider.momentOfInertia,
  });
  addGravityComponent(world, entity, { amount: gravity });

  addAngularVelocityMotorComponent(world, entity, {
    targetVelocity: 0,
    maxTorque: ballMaxTorque,
  });

  return { entity };
}
