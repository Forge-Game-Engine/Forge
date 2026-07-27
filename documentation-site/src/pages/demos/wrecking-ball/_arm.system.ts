import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { ArmEcsComponent, armId } from './_arm.component';

/**
 * Repositions, resizes, and rotates each matched entity's (nine-sliced)
 * sprite to span the rod between its `ArmEcsComponent.pivotPosition` and
 * `body`'s current position every tick, so the arm visibly swings with the
 * ball instead of only the (otherwise invisible) RevoluteJoint moving it.
 * The rotation this computes from the pivot/ball positions, via `Vector2`'s
 * world-space (Y-up) convention, matches the angle a RevoluteJoint's own
 * `anchorB` convention would give a body rigidly fixed to the far end of the
 * rod - but negated before being assigned, since `RotationEcsComponent.world`
 * is in render space (Y-down), mirrored from world space (see
 * `createPhysicsSyncEcsSystem`'s same negation when it copies a
 * `RigidBody.angle`). This lets the arm swing in lockstep with the ball
 * without needing to read the ball's own (potentially independently
 * spinning) rotation. Must run before `createRenderEcsSystem` so the render
 * pass sees this tick's updated arm.
 */
export const createArmEcsSystem = (): EcsSystem<
  [
    ArmEcsComponent,
    PositionEcsComponent,
    RotationEcsComponent,
    SpriteEcsComponent,
  ]
> => ({
  query: [armId, positionId, rotationId, spriteId],
  run: (result) => {
    const [arm, positionComponent, rotationComponent, spriteComponent] =
      result.components;
    const { pivotPosition, body, armWidth } = arm;

    const delta = body.position.subtract(pivotPosition);
    const length = delta.magnitude();
    const midpoint = pivotPosition.add(body.position).multiply(0.5);
    const angle = -Math.atan2(delta.x, -delta.y);

    positionComponent.world.x = midpoint.x;
    positionComponent.world.y = midpoint.y;
    positionComponent.local.x = midpoint.x;
    positionComponent.local.y = midpoint.y;

    rotationComponent.world = angle;
    rotationComponent.local = angle;

    spriteComponent.width = armWidth;
    spriteComponent.height = length;
  },
});
