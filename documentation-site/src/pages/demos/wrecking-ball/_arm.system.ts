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
 * `entity`'s current position every tick, so the arm visibly swings with the
 * ball instead of only the (otherwise invisible) revolute joint moving it.
 * The angle is derived so that a vertical (pointing down) sprite at
 * rotation 0 aligns with the pivot-to-ball direction, matching this
 * engine's `Vector2.rotate` convention (counter-clockwise-positive,
 * `atan2(y, x)`). Must run before `createRenderEcsSystem` so the render
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
  update: (world, { components: [arms, positions, rotations, sprites] }) => {
    for (let i = 0; i < arms.length; i++) {
      const arm = arms[i];
      const positionComponent = positions[i];
      const rotationComponent = rotations[i];
      const spriteComponent = sprites[i];
      const { pivotPosition, entity, armWidth } = arm;

      const targetPosition = world.getComponent(entity, positionId);

      if (targetPosition === null) {
        continue;
      }

      const bodyPosition = targetPosition.world;
      const delta = bodyPosition.subtract(pivotPosition);
      const length = delta.magnitude();
      const midpoint = pivotPosition.add(bodyPosition).multiply(0.5);
      const angle = Math.atan2(delta.x, -delta.y);

      positionComponent.world.x = midpoint.x;
      positionComponent.world.y = midpoint.y;
      positionComponent.local.x = midpoint.x;
      positionComponent.local.y = midpoint.y;

      rotationComponent.world = angle;
      rotationComponent.local = angle;

      spriteComponent.width = armWidth;
      spriteComponent.height = length;
    }
  },
});
