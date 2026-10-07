import { createTagId } from '../../ecs/ecs-component.js';

/**
 * A tag that marks an entity with a `LifetimeEcsComponent` to be
 * removed from the world once it expires, by
 * `createRemoveFromWorldEcsSystem`.
 */
export const RemoveFromWorldLifetimeStrategyId = createTagId(
  'removeFromWorldLifetimeStrategy',
);
