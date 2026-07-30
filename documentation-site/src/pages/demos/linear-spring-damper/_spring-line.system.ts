import {
  PositionEcsComponent,
  positionId,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { SpringLineEcsComponent, springLineId } from './_spring-line.component';

/**
 * Repositions and resizes each matched entity's (nine-sliced) sprite to span
 * the line between its `SpringLineEcsComponent.anchorPosition` and `body`'s
 * current position every tick, purely a visual aid for the demo (the anchor
 * and body are always vertically aligned here, so no rotation is needed).
 * Must run before `createRenderEcsSystem` so the render pass sees this
 * tick's updated line.
 */
export const createSpringLineEcsSystem = (): EcsSystem<
  [SpringLineEcsComponent, PositionEcsComponent, SpriteEcsComponent]
> => ({
  query: [springLineId, positionId, spriteId],
  update: (_world, { components: [springLines, positions, sprites] }) => {
    for (let i = 0; i < springLines.length; i++) {
      const springLine = springLines[i];
      const positionComponent = positions[i];
      const spriteComponent = sprites[i];
      const { anchorPosition, body, lineWidth } = springLine;

      const midpoint = anchorPosition.add(body.position).multiply(0.5);
      const length = body.position.subtract(anchorPosition).magnitude();

      positionComponent.world.x = midpoint.x;
      positionComponent.world.y = midpoint.y;
      positionComponent.local.x = midpoint.x;
      positionComponent.local.y = midpoint.y;

      spriteComponent.width = lineWidth;
      spriteComponent.height = length;
    }
  },
});
