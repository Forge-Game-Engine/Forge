// This file has been deprecated due to ECS migration
// TODO: Rewrite for new ECS API when needed

/**
 * @deprecated This utility uses the old ECS API and needs to be rewritten.
 * The old Entity class and component names no longer exist.
 * Use the new ECS API with EcsWorld and ECS component IDs instead.
 */
export function createSprite(): never {
  throw new Error(
    'createSprite has been deprecated. Use the new ECS API with EcsWorld and component IDs.',
  );
}
