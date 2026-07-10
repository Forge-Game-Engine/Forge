import { PositionEcsComponent, positionId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';

/**
 * Adds a camera entity to the world with the specified options.
 *
 * @param world - The ECS world to which the camera will be added.
 * @param cameraOptions - Options for configuring the camera.
 * @returns The created camera entity, for attaching further components to (for example `addGaussianBlur`).
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
    cullingMask: cameraOptions.cullingMask ?? 0xffffffff,
    scissorRect: cameraOptions.scissorRect,
    zoomInput: cameraOptions.zoomInput,
    panInput: cameraOptions.panInput,
    renderTarget: cameraOptions.renderTarget,
    layer: cameraOptions.layer ?? 0,
  };

  const positionComponent: PositionEcsComponent = {
    local: Vector2.zero,
    world: Vector2.zero,
  };

  world.addComponent(cameraEntity, cameraId, cameraComponent);
  world.addComponent(cameraEntity, positionId, positionComponent);

  return cameraEntity;
}
