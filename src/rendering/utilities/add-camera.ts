import { positionId, PositionEcsComponent } from '../../common/index.js';
import { EcsWorld } from '../../new-ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import {
  cameraId,
  CameraEcsComponent,
} from '../components/index.js';

/**
 * Adds a camera entity to the world with the specified options.
 * Note: This function only creates the camera entity and components.
 * You must separately add the camera system to the world using:
 * `world.addSystem(createCameraEcsSystem(time))`
 *
 * @param world - The ECS world to which the camera will be added.
 * @param cameraOptions - Options for configuring the camera.
 * @returns The entity ID that contains the camera component.
 */
export function addCamera(
  world: EcsWorld,
  cameraOptions: Partial<CameraEcsComponent> = {},
): number {
  const cameraEntity = world.createEntity();

  const cameraComponent: CameraEcsComponent = {
    zoom: cameraOptions.zoom ?? 1,
    zoomSensitivity: cameraOptions.zoomSensitivity ?? 0.1,
    panSensitivity: cameraOptions.panSensitivity ?? 1,
    minZoom: cameraOptions.minZoom ?? 0.1,
    maxZoom: cameraOptions.maxZoom ?? 10,
    isStatic: cameraOptions.isStatic ?? false,
    layerMask: cameraOptions.layerMask ?? 0xffffffff,
    scissorRect: cameraOptions.scissorRect,
    zoomInput: cameraOptions.zoomInput,
    panInput: cameraOptions.panInput,
  };

  const positionComponent: PositionEcsComponent = {
    local: Vector2.zero,
    world: Vector2.zero,
  };

  world.addComponent(cameraEntity, cameraId, cameraComponent);
  world.addComponent(cameraEntity, positionId, positionComponent);

  return cameraEntity;
}
