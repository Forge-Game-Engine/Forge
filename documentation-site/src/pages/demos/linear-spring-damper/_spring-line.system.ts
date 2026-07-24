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
 * Repositions each matched entity's sprite to span the line between its
 * `SpringLineEcsComponent.anchorPosition` and `body`'s current position
 * every tick, resizing it directly via `SpriteEcsComponent.width`/`height`
 * (rather than a non-uniform `ScaleEcsComponent`) so the sprite's
 * nine-sliced end caps stay a fixed size as the line stretches instead of
 * smearing with it - purely a visual aid for the demo (the anchor and body
 * are always vertically aligned here, so no rotation is needed). Must run
 * before `createRenderEcsSystem` so the render pass sees this tick's
 * updated line.
 */
export const createSpringLineEcsSystem = (): EcsSystem<
  [SpringLineEcsComponent, PositionEcsComponent, SpriteEcsComponent]
> => ({
  query: [springLineId, positionId, spriteId],
  run: (result) => {
    const [springLine, positionComponent, sprite] = result.components;
    const { anchorPosition, body, lineWidth } = springLine;

    const midpoint = anchorPosition.add(body.position).multiply(0.5);
    const length = body.position.subtract(anchorPosition).magnitude();

    positionComponent.world.x = midpoint.x;
    positionComponent.world.y = midpoint.y;
    positionComponent.local.x = midpoint.x;
    positionComponent.local.y = midpoint.y;

    sprite.width = lineWidth;
    sprite.height = length;
  },
});
