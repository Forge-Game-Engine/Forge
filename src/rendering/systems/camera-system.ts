import { PositionComponent, Time } from '../../common';
import * as math from '../../math';
import { Entity, System } from '../../ecs';
import { CameraComponent } from '../components';

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
    super('camera', [CameraComponent.symbol, PositionComponent.symbol]);

    this._time = time;
  }

  /**
   * Runs the camera system for the given entity, updating the camera's zoom and position
   * based on user inputs.
   * @param entity - The entity that contains the `CameraComponent` and `PositionComponent`.
   */
  public run(entity: Entity): void {
    const cameraComponent = entity.getComponentRequired<CameraComponent>(
      CameraComponent.symbol,
    );

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

    const position = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );

    if (zoomInput) {
      cameraComponent.zoom = math.clamp(
        zoom - zoomInput.value * zoomSensitivity * 100,
        minZoom,
        maxZoom,
      );
    }

    if (panInput) {
      const zoomPanMultiplier =
        cameraComponent.panSensitivity *
        (1 / cameraComponent.zoom) *
        this._time.rawDeltaTimeInMilliseconds;

      position.y += panInput.value.y * zoomPanMultiplier;
      position.x += panInput.value.x * zoomPanMultiplier;
    }
  }
}
