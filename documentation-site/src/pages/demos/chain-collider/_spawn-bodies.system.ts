import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  MouseInputSource,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  addGravityComponent,
  addRigidBodyComponent,
  CircleCollider,
  Collider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  getCameraView,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';

const gravity = { x: 0, y: 600 };
const boxSize = 36;
const ballRadius = 16;
const fastBallRadius = 10;

/**
 * 2000 units a second is over 33 units a tick, more than the thin wall's
 * thickness and the fast ball's diameter together, so without continuous
 * collision detection the ball would pass through the wall in one tick.
 */
const fastBallSpeed = 2000;
const fastBallStart = { x: -390, y: -50 };

/** The actions that spawn bodies, and what the system needs to place them. */
export interface SpawnBodiesDependencies {
  dropBoxInput: TriggerAction;
  dropBallInput: TriggerAction;
  fireBallInput: TriggerAction;
  mouseInputSource: MouseInputSource;
  camera: number;
  renderContext: RenderContext;
  boxSprite: SpriteEcsComponent;
  ballSprite: SpriteEcsComponent;
}

/**
 * Adds a dynamic body with gravity: a sprite, a collider and a rigid body.
 * @returns The body's rigid body, to give it a velocity.
 */
function spawnBody(
  world: EcsWorld,
  position: Vector2,
  sprite: SpriteEcsComponent,
  collider: Collider,
): ReturnType<typeof addRigidBodyComponent> {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: position });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, sprite);
  addColliderComponent(world, entity, {
    collider,
    friction: 0.5,
    restitution: 0.1,
  });
  addGravityComponent(world, entity, { amount: gravity });

  return addRigidBodyComponent(world, entity);
}

function boxCollider(): PolygonCollider {
  const half = boxSize / 2;

  return new PolygonCollider([
    { x: -half, y: -half },
    { x: half, y: -half },
    { x: half, y: half },
    { x: -half, y: half },
  ]);
}

/**
 * Creates a system that drops a box or a ball at the cursor, and fires a
 * fast ball at the thin wall, when their actions trigger. It queries no
 * components: it only reads the actions and adds entities.
 * @param dependencies - The actions, input source and sprites it uses.
 * @returns The ECS system.
 */
export const createSpawnBodiesEcsSystem = ({
  dropBoxInput,
  dropBallInput,
  fireBallInput,
  mouseInputSource,
  camera,
  renderContext,
  boxSprite,
  ballSprite,
}: SpawnBodiesDependencies): EcsSystem<[]> => ({
  query: [],
  update: (world) => {
    const cursor = (): Vector2 =>
      getCameraView(world, camera, renderContext).viewportToWorld(
        mouseInputSource.position,
      );

    if (dropBoxInput.isTriggered) {
      spawnBody(
        world,
        cursor(),
        { ...boxSprite, width: boxSize, height: boxSize },
        boxCollider(),
      );
    }

    if (dropBallInput.isTriggered) {
      spawnBody(
        world,
        cursor(),
        { ...ballSprite, width: ballRadius * 2, height: ballRadius * 2 },
        new CircleCollider(ballRadius),
      );
    }

    if (fireBallInput.isTriggered) {
      const rigidBody = spawnBody(
        world,
        { ...fastBallStart },
        {
          ...ballSprite,
          width: fastBallRadius * 2,
          height: fastBallRadius * 2,
        },
        new CircleCollider(fastBallRadius),
      );

      rigidBody.velocity.x = fastBallSpeed;
    }
  },
});
