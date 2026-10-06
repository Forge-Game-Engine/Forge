import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
} from '@forge-game-engine/forge/common';
import { Random, Vec2 } from '@forge-game-engine/forge/math';
import {
  ContactsEcsComponent,
  contactsId,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { BallEcsComponent, ballId } from './_ball.component';
import { launchBall } from './_create-ball';
import { BrickField } from './_create-bricks';

/**
 * Creates an ECS system that destroys any brick the ball is touching this
 * tick (via the ball's `ContactsEcsComponent`, filled by
 * `createNarrowPhaseEcsSystem`)
 * and resets the ball back to its start position - relaunching it - once it
 * falls below `missY`.
 *
 * Must run after `createNarrowPhaseEcsSystem`, so this tick's contacts are
 * available before this system checks them.
 * @param random - The random source used to vary the relaunch angle.
 * @param missY - The world-space y coordinate below which the ball is
 * considered to have missed the paddle.
 * @param brickField - The brick field, used to check/destroy bricks the
 * ball is touching.
 */
export const createBallEcsSystem = (
  random: Random,
  missY: number,
  brickField: BrickField,
): EcsSystem<
  [
    BallEcsComponent,
    PositionEcsComponent,
    RigidBodyEcsComponent,
    ContactsEcsComponent,
  ]
> => ({
  query: [ballId, positionId, rigidBodyId, contactsId],
  update: (
    _world,
    {
      entities,
      components: [ballComponents, positionComponents, rigidBodies, contacts],
    },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const ballComponent = ballComponents[i];
      const positionComponent = positionComponents[i];
      const rigidBody = rigidBodies[i];

      for (const otherEntity of contacts[i].touching) {
        if (brickField.has(otherEntity)) {
          brickField.destroy(otherEntity);
        }
      }

      if (positionComponent.local.y < missY) {
        positionComponent.local = Vec2.clone(ballComponent.startPosition);
        launchBall(rigidBody, ballComponent.speed, random);
      }
    }
  },
});
