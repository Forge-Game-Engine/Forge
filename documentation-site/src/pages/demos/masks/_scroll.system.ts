import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { ScrollComponent, scrollId } from './_scroll.component';

/**
 * Creates a system that moves every scrolling entity's `position.local.y`
 * up at its speed, wrapping it back after `wrapHeight`.
 * @param time - The time the scroll follows.
 * @returns The scroll ECS system.
 */
export const createScrollEcsSystem = (
  time: Time,
): EcsSystem<[ScrollComponent, PositionEcsComponent]> => ({
  name: 'scroll',
  query: [scrollId, positionId],
  update: (_world, { components: [scrolls, positions] }) => {
    for (let i = 0; i < scrolls.length; i++) {
      const { speed, wrapHeight } = scrolls[i];

      positions[i].local.y =
        ((time.timeInSeconds * speed) % wrapHeight) - wrapHeight / 2;
    }
  },
});
