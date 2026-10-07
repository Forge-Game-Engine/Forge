import { PositionEcsComponent, positionId, Time } from '../../common/index.js';
import * as math from '../../math/index.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';

/**
 * Creates a system that zooms and pans cameras from input. For each camera
 * that isn't `isStatic`, it scales `zoom` by `zoomInput`'s value (by
 * `zoomSensitivity`, clamped to `[minZoom, maxZoom]`), and moves
 * `position.local` by `panInput`'s value (by `panSensitivity`, divided by
 * `zoom`, per millisecond of raw delta time). Register it before
 * `createTransformEcsSystem`.
 * @param time - The time the pan speed is measured against.
 * @returns The camera ECS system.
 */
export const createCameraEcsSystem = (
  time: Time,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  update: (_world, { components: [cameraComponents, positions] }) => {
    for (let i = 0; i < cameraComponents.length; i++) {
      const cameraComponent = cameraComponents[i];
      const position = positions[i];

      const {
        isStatic,
        zoomInput,
        zoom,
        minZoom,
        maxZoom,
        zoomSensitivity,
        panInput,
      } = cameraComponent;

      if (isStatic) {
        continue;
      }

      if (zoomInput) {
        // Use multiplicative (exponential) scaling so scrolling has consistent effect
        // regardless of current zoom level. Positive zoomInput.value will reduce zoom,
        // negative will increase it.
        const scaleFactor = Math.pow(1 + zoomSensitivity, -zoomInput.value);
        cameraComponent.zoom = math.clamp(zoom * scaleFactor, minZoom, maxZoom);
      }

      if (panInput) {
        const zoomPanMultiplier =
          cameraComponent.panSensitivity *
          (1 / cameraComponent.zoom) *
          time.rawDeltaTimeInMilliseconds;

        position.local.y += panInput.value.y * zoomPanMultiplier;
        position.local.x += panInput.value.x * zoomPanMultiplier;
      }
    }
  },
});
