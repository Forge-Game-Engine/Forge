import {
  getInterpolatedLocalPosition,
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { SpringLineEcsComponent, springLineId } from './_spring-line.component';

/**
 * Repositions and resizes each matched entity's (nine-sliced) sprite to span
 * the line between its `SpringLineEcsComponent.anchorPosition` and the
 * target entity's current position every frame, purely a visual aid for the
 * demo (the anchor and body are always vertically aligned here, so no
 * rotation is needed). Runs in the default group, after the frame's fixed
 * steps. Reads the target's interpolated position (where the frame's
 * transform system draws the body, between its last two fixed steps) and
 * writes only the line's `local` position, so it must run before the default
 * group's `createTransformEcsSystem` for the render pass to see this frame's
 * line ending on the body.
 * @param time - The time whose overstep fraction blends the body's position.
 */
export const createSpringLineEcsSystem = (
  time: Time,
): EcsSystem<
  [SpringLineEcsComponent, PositionEcsComponent, SpriteEcsComponent]
> => ({
  query: [springLineId, positionId, spriteId],
  update: (world, { components: [springLines, positions, sprites] }) => {
    for (let i = 0; i < springLines.length; i++) {
      const springLine = springLines[i];
      const positionComponent = positions[i];
      const spriteComponent = sprites[i];
      const { anchorPosition, entity, lineWidth } = springLine;

      if (world.getComponent(entity, positionId) === null) {
        continue;
      }

      const bodyPosition = getInterpolatedLocalPosition(world, entity, time);
      // Clone before adding/subtracting: `anchorPosition` is a persistent
      // component field reused every tick.
      const midpoint = Vec2.multiply(
        Vec2.add(Vec2.clone(anchorPosition), bodyPosition),
        0.5,
      );
      const length = Vec2.magnitude(
        Vec2.subtract(Vec2.clone(bodyPosition), anchorPosition),
      );

      positionComponent.local.x = midpoint.x;
      positionComponent.local.y = midpoint.y;

      spriteComponent.width = lineWidth;
      spriteComponent.height = length;
    }
  },
});
