// This file has been deprecated due to ECS migration
// TODO: Rewrite for new ECS API when needed

/**
 * @deprecated This utility uses the old ECS API and needs to be rewritten.
 * The old Entity, World, CameraComponent, and CameraSystem classes no longer exist.
 * Use the new ECS API with EcsWorld, createCameraEcsSystem, and component IDs instead.
 */
export function addCamera(): never {
  throw new Error(
    'addCamera has been deprecated. Use the new ECS API with EcsWorld and createCameraEcsSystem.',
  );
}
