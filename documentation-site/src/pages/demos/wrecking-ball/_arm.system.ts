import {
  getInterpolatedLocalPosition,
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { ArmEcsComponent, armId } from './_arm.component';

/**
 * Repositions, resizes, and rotates each matched entity's (nine-sliced)
 * sprite to span the rod between its `ArmEcsComponent.pivotPosition` and
 * `entity`'s current position every frame, so the arm visibly swings with the
 * ball instead of only the (otherwise invisible) revolute joint moving it.
 * The angle is derived so that a vertical (pointing down) sprite at
 * rotation 0 aligns with the pivot-to-ball direction, matching this
 * engine's `Vector2.rotate` convention (a positive angle turns `+X` towards
 * `+Y`, which is clockwise on the Y-down screen). Runs in the default group,
 * after the frame's fixed steps. Reads the ball's interpolated position
 * (where the frame's transform system draws the ball, between its last two
 * fixed steps) and writes only the arm's `local` pose, so it must run before
 * the default group's `createTransformEcsSystem` for the render pass to see
 * this frame's arm ending on the ball.
 * @param time - The time whose overstep fraction blends the ball's position.
 */
export const createArmEcsSystem = (
  time: Time,
): EcsSystem<
  [
    ArmEcsComponent,
    PositionEcsComponent,
    RotationEcsComponent,
    SpriteEcsComponent,
  ]
> => ({
  query: [armId, positionId, rotationId, spriteId],
  update: (world, { components: [arms, positions, rotations, sprites] }) => {
    for (let i = 0; i < arms.length; i++) {
      const arm = arms[i];
      const positionComponent = positions[i];
      const rotationComponent = rotations[i];
      const spriteComponent = sprites[i];
      const { pivotPosition, entity, armWidth } = arm;

      if (world.getComponent(entity, positionId) === null) {
        continue;
      }

      const bodyPosition = getInterpolatedLocalPosition(world, entity, time);
      // clone: bodyPosition is reused for the midpoint below.
      const delta = Vec2.subtract(Vec2.clone(bodyPosition), pivotPosition);
      const length = Vec2.magnitude(delta);
      // clone: pivotPosition is a persistent ArmEcsComponent field, reused every tick.
      const midpoint = Vec2.multiply(
        Vec2.add(Vec2.clone(pivotPosition), bodyPosition),
        0.5,
      );
      const angle = Math.atan2(-delta.x, delta.y);

      positionComponent.local.x = midpoint.x;
      positionComponent.local.y = midpoint.y;

      rotationComponent.local = angle;

      spriteComponent.width = armWidth;
      spriteComponent.height = length;
    }
  },
});
