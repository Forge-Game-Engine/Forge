import { PositionEcsComponent, positionId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  UiWorldSpaceFollowEcsComponent,
  uiWorldSpaceFollowId,
} from '../components/ui-world-space-follow-component.js';

/**
 * Creates a system that moves every `UiWorldSpaceFollowEcsComponent`
 * entity to its `target`'s world position, offset by the entity's own
 * layout-resolved local position. It writes `PositionEcsComponent.local`,
 * which `createTransformEcsSystem` then turns into `world`, and reads only
 * the target's position, never its rotation or scale, unlike an ordinary
 * `ParentEcsComponent` relationship (see `UiWorldSpaceFollowEcsComponent`
 * for why this is a separate mechanism).
 *
 * `createUiLayoutEcsSystem` resets the entity's local position to its
 * anchored offset every frame, and this system adds the target's world
 * position on top, so it must run after layout and before the transform
 * system. `registerUiSystems` registers it in that order for you.
 *
 * The target's world position is the one the transform system resolved on
 * the previous frame, so a moving target is followed one frame behind.
 * @returns The UI world-space follow ECS system.
 * @throws An error if a `UiWorldSpaceFollowEcsComponent.target` has no
 * `PositionEcsComponent`.
 */
export const createUiWorldSpaceFollowEcsSystem = (): EcsSystem<
  [UiWorldSpaceFollowEcsComponent, PositionEcsComponent]
> => ({
  name: 'uiWorldSpaceFollow',
  query: [uiWorldSpaceFollowId, positionId],
  update: (world, { entities, components: [follows, positions] }) => {
    for (let i = 0; i < entities.length; i++) {
      const targetPosition = world.getComponent<PositionEcsComponent>(
        follows[i].target,
        positionId,
      );

      if (!targetPosition) {
        throw new Error(
          `Entity "${entities[i]}" has a UiWorldSpaceFollowEcsComponent targeting entity "${follows[i].target}", which has no PositionEcsComponent.`,
        );
      }

      const position = positions[i];

      position.local.x += targetPosition.world.x;
      position.local.y += targetPosition.world.y;
    }
  },
});
