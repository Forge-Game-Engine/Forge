import {
  PositionComponent,
  PositionEcsComponent,
  positionId,
  Time,
} from '../../common/index.js';
import * as math from '../../math/index.js';
import { Entity, System } from '../../ecs/index.js';
import {
  CameraComponent,
  CameraEcsComponent,
  cameraId,
} from '../components/index.js';
import { EcsSystem } from '../../new-ecs/ecs-system.js';

/**
 * The `CameraSystem` class manages the camera's
 * zooming and panning based on user inputs.
 */
export class CameraSystem extends System {
  private readonly _time: Time;

  /**
   * Constructs a new instance of the `CameraSystem` class.
   * @param time - The `Time` instance for managing time-related operations.
   */
  constructor(time: Time) {
    super([CameraComponent, PositionComponent], 'camera');

    this._time = time;
  }

  /**
   * Runs the camera system for the given entity, updating the camera's zoom and position
   * based on user inputs.
   * @param entity - The entity that contains the `CameraComponent` and `PositionComponent`.
   */
  public run(entity: Entity): void {
    const cameraComponent = entity.getComponentRequired(CameraComponent);

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

    const position = entity.getComponentRequired(PositionComponent);

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
        this._time.rawDeltaTimeInMilliseconds;

      position.local.y += panInput.value.y * zoomPanMultiplier;
      position.local.x += panInput.value.x * zoomPanMultiplier;
    }
  }
}

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
