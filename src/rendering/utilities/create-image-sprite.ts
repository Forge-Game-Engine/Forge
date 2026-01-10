// This file has been deprecated due to ECS migration
// TODO: Rewrite for new ECS API when needed

/**
 * @deprecated This utility uses the old ECS API and needs to be rewritten.
 * The old Entity class no longer exists.
 * Use the new ECS API with EcsWorld and component IDs instead.
 */
export function createImageSprite(): never {
  throw new Error(
    'createImageSprite has been deprecated. Use the new ECS API with EcsWorld and component IDs.',
  );
}
