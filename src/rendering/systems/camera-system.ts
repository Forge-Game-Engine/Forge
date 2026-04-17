import { PositionEcsComponent, positionId, Time } from '../../common/index.js';
import * as math from '../../math/index.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';
import { EcsSystem } from '../../new-ecs/ecs-system.js';

/**
 * Creates a camera system that updates camera zoom and position based on input.
 * @param time The time instance
 * @returns The camera ECS system
 */
export const createCameraEcsSystem = (
  time: Time,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  run: (result) => {
    const [cameraComponent, position] = result.components;

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
      return;
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
  },
});
