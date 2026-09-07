import { PositionEcsComponent, positionId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  UiWorldSpaceFollowEcsComponent,
  uiWorldSpaceFollowId,
} from '../components/ui-world-space-follow-component.js';

/**
 * Creates a system that overwrites every `UiWorldSpaceFollowEcsComponent`
 * entity's `PositionEcsComponent.world` with its `target`'s own world
 * position plus this entity's already-resolved local offset - the world
 * *position* only, never the target's rotation or scale, unlike an
 * ordinary `ParentEcsComponent` relationship (see that component's own
 * follow-vs-parent doc comment for why this is a separate mechanism).
 *
 * Must be registered after `createTransformEcsSystem` (so `target`'s world
 * position for this tick is already resolved) - unlike the rest of the UI
 * pipeline, `createUiCanvas` does not register this one for you, since its
 * one dependency runs the opposite direction from every other UI system
 * (which all run *before* `createTransformEcsSystem`). Register it
 * yourself, once, right after `createTransformEcsSystem`, for any world
 * using `renderMode: 'worldSpace'` canvases that should follow a target.
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

      position.world.x = targetPosition.world.x + position.local.x;
      position.world.y = targetPosition.world.y + position.local.y;
    }
  },
});
