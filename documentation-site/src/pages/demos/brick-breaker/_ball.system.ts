import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
} from '@forge-game-engine/forge/common';
import { Random, vector2Clone } from '@forge-game-engine/forge/math';
import {
  CollisionManifold,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { BallEcsComponent, ballId } from './_ball.component';
import { launchBall } from './_create-ball';
import { BrickField } from './_create-bricks';

/**
 * Creates an ECS system that destroys any brick the ball is touching this
 * tick (via `collisionManifolds`, populated by `createNarrowPhaseEcsSystem`)
 * and resets the ball back to its start position - relaunching it - once it
 * falls below `missY`.
 *
 * Must run after `createNarrowPhaseEcsSystem`, so this tick's collisions are
 * available before this system checks them.
 * @param collisionManifolds - The narrow-phase system's output: this tick's
 * confirmed collisions.
 * @param random - The random source used to vary the relaunch angle.
 * @param missY - The world-space y coordinate below which the ball is
 * considered to have missed the paddle.
 * @param brickField - The brick field, used to check/destroy bricks the
 * ball is touching.
 */
export const createBallEcsSystem = (
  collisionManifolds: CollisionManifold[],
  random: Random,
  missY: number,
  brickField: BrickField,
): EcsSystem<[BallEcsComponent, PositionEcsComponent, RigidBodyEcsComponent]> => ({
  query: [ballId, positionId, rigidBodyId],
  update: (
    _world,
    { entities, components: [ballComponents, positionComponents, rigidBodies] },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const ballEntity = entities[i];
      const ballComponent = ballComponents[i];
      const positionComponent = positionComponents[i];
      const rigidBody = rigidBodies[i];

      destroyCollidedBricks(collisionManifolds, ballEntity, brickField);

      if (positionComponent.world.y < missY) {
        positionComponent.world = vector2Clone(ballComponent.startPosition);
        positionComponent.local = vector2Clone(ballComponent.startPosition);
        launchBall(rigidBody, ballComponent.speed, random);
      }
    }
  },
});

const destroyCollidedBricks = (
  collisionManifolds: CollisionManifold[],
  ballEntity: number,
  brickField: BrickField,
): void => {
  for (const { entityA, entityB } of collisionManifolds) {
    if (entityA !== ballEntity && entityB !== ballEntity) {
      continue;
    }

    const otherEntity = entityA === ballEntity ? entityB : entityA;

    if (brickField.has(otherEntity)) {
      brickField.destroy(otherEntity);
    }
  }
};
