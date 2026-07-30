import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
} from '@forge-game-engine/forge/common';
import { Random } from '@forge-game-engine/forge/math';
import {
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
  PhysicsWorld,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import { BallEcsComponent, ballId } from './_ball.component';
import { launchBall } from './_create-ball';
import { BrickField } from './_create-bricks';

export const createBallEcsSystem = (
  physicsWorld: PhysicsWorld,
  random: Random,
  missY: number,
  brickField: BrickField,
): EcsSystem<
  [BallEcsComponent, PositionEcsComponent, PhysicsBodyEcsComponent]
> => ({
  query: [ballId, positionId, PhysicsBodyId],
  update: (
    _world,
    { components: [ballComponents, positionComponents, physicsBodyComponents] },
  ) => {
    for (let i = 0; i < ballComponents.length; i++) {
      const ballComponent = ballComponents[i];
      const positionComponent = positionComponents[i];
      const physicsBodyComponent = physicsBodyComponents[i];
      const { physicsBody } = physicsBodyComponent;

      destroyCollidedBricks(physicsWorld, physicsBody, brickField);

      if (positionComponent.world.y < missY) {
        physicsBody.position = ballComponent.startPosition.clone();
        positionComponent.world = ballComponent.startPosition.clone();
        launchBall(physicsBody, ballComponent.speed, random);
      }
    }
  },
});

const destroyCollidedBricks = (
  physicsWorld: PhysicsWorld,
  physicsBody: RigidBody,
  brickField: BrickField,
): void => {
  for (const { bodyA, bodyB } of physicsWorld.collisionStarts) {
    if (bodyA !== physicsBody && bodyB !== physicsBody) {
      continue;
    }

    const otherEntity = (bodyA === physicsBody ? bodyB : bodyA).userData;

    if (typeof otherEntity === 'number' && brickField.has(otherEntity)) {
      brickField.destroy(otherEntity);
    }
  }
};
