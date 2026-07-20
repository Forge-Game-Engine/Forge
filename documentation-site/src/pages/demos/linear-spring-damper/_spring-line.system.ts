import {
  PositionEcsComponent,
  positionId,
  ScaleEcsComponent,
  scaleId,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { SpringLineEcsComponent, springLineId } from './_spring-line.component';

/**
 * Repositions and rescales each matched entity's sprite to span the line
 * between its `SpringLineEcsComponent.anchorPosition` and `body`'s current
 * position every tick, purely a visual aid for the demo (the anchor and
 * body are always vertically aligned here, so no rotation is needed). Must
 * run before `createRenderEcsSystem` so the render pass sees this tick's
 * updated line.
 */
export const createSpringLineEcsSystem = (): EcsSystem<
  [SpringLineEcsComponent, PositionEcsComponent, ScaleEcsComponent]
> => ({
  query: [springLineId, positionId, scaleId],
  run: (result) => {
    const [springLine, positionComponent, scaleComponent] = result.components;
    const { anchorPosition, body, lineWidth, spriteWidth, spriteHeight } =
      springLine;

    const midpoint = anchorPosition.add(body.position).multiply(0.5);
    const length = body.position.subtract(anchorPosition).magnitude();

    positionComponent.world.x = midpoint.x;
    positionComponent.world.y = midpoint.y;
    positionComponent.local.x = midpoint.x;
    positionComponent.local.y = midpoint.y;

    scaleComponent.world.x = lineWidth / spriteWidth;
    scaleComponent.world.y = length / spriteHeight;
    scaleComponent.local.x = lineWidth / spriteWidth;
    scaleComponent.local.y = length / spriteHeight;
  },
});
