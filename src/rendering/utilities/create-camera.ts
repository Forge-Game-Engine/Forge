import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { addCameraComponent, CameraEcsComponent } from '../components/index.js';

/**
 * Creates a new entity with a {@link CameraEcsComponent} and the
 * `PositionEcsComponent` it needs to be panned by `createCameraEcsSystem`.
 * @param world - The ECS world to create the camera entity in.
 * @param options - Options for configuring the camera.
 * @returns The created camera entity, for attaching further components to
 * (for example `addGaussianBlurComponent`).
 */
export function createCamera(
  world: EcsWorld,
  options: Partial<CameraEcsComponent> = {},
): number {
  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity);
  addCameraComponent(world, cameraEntity, options);

  return cameraEntity;
}
