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
import { ArmLineEcsComponent, armLineId } from './_arm-line.component';

/**
 * Repositions, rotates and resizes each matched entity's sprite to span the
 * line between its `ArmLineEcsComponent.pivotPosition` and `body`'s current
 * position every tick, purely a visual aid for the demo (the ball's own
 * `RigidBody.angle` tracks its spin, not its swing angle about the crane's
 * pivot, so the arm's direction has to be derived from the two positions
 * instead). Resized directly via `SpriteEcsComponent.width`/`height` (rather
 * than a non-uniform `ScaleEcsComponent`) so the sprite's nine-sliced end
 * caps stay a fixed size instead of smearing as the ball swings. Must run
 * before `createRenderEcsSystem` so the render pass sees this tick's updated
 * arm, and after `createPhysicsSyncEcsSystem` so `body.position` reflects
 * this tick's physics step.
 */
export const createArmLineEcsSystem = (): EcsSystem<
  [ArmLineEcsComponent, PositionEcsComponent, RotationEcsComponent, SpriteEcsComponent]
> => ({
  query: [armLineId, positionId, rotationId, spriteId],
  run: (result) => {
    const [armLine, positionComponent, rotationComponent, sprite] =
      result.components;
    const { pivotPosition, body, lineWidth } = armLine;

    const midpoint = pivotPosition.add(body.position).multiply(0.5);
    const toPivot = pivotPosition.subtract(body.position);
    const length = toPivot.magnitude();

    // The inverse of the rotation `Vector2.rotate` applies to a sprite's
    // local "up" (0, 1) axis - see how `_create-wrecking-ball.ts` derives
    // the joint's `anchorB` from `pivotPosition`/`ballStartPosition` for the
    // matching forward relationship this undoes.
    const angle = Math.atan2(-toPivot.x, toPivot.y);

    positionComponent.world.x = midpoint.x;
    positionComponent.world.y = midpoint.y;
    positionComponent.local.x = midpoint.x;
    positionComponent.local.y = midpoint.y;

    rotationComponent.world = angle;
    rotationComponent.local = angle;

    sprite.width = lineWidth;
    sprite.height = length;
  },
});
