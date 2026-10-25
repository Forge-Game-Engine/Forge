import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
} from '@forge-game-engine/forge/common';
import { Random, Vec2 } from '@forge-game-engine/forge/math';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { BallEcsComponent, ballId } from './_ball.component';
import { launchBall } from './_create-ball';

/**
 * Creates an ECS system that moves the ball back to its start position and
 * relaunches it once it falls below `missY`.
 *
 * Register it in the fixed-update group before that group's
 * `createTransformEcsSystem`. Moving the ball is a teleport, not motion:
 * the transform pass copies the new `local` position into `world` before
 * the step's physics systems run, so continuous collision sweeps the ball
 * from its start position. Teleported later in the step, the ball would be
 * swept from below the paddle up to its start position, and the paddle
 * could stop it on the way.
 * @param random - The random source used to vary the relaunch angle.
 * @param missY - The world-space y coordinate below which the ball is
 * considered to have missed the paddle.
 */
export const createBallResetEcsSystem = (
  random: Random,
  missY: number,
): EcsSystem<
  [BallEcsComponent, PositionEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [ballId, positionId, rigidBodyId],
  update: (
    _world,
    { entities, components: [ballComponents, positionComponents, rigidBodies] },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const ballComponent = ballComponents[i];
      const positionComponent = positionComponents[i];

      if (positionComponent.local.y > missY) {
        positionComponent.local = Vec2.clone(ballComponent.startPosition);
        launchBall(rigidBodies[i], ballComponent.speed, random);
      }
    }
  },
});
