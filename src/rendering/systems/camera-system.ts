import { PositionComponent, Time } from '../../common';
import * as math from '../../math';
import { Entity, System } from '../../ecs';
import { InputsComponent, keyCodes } from '../../input';
import { CameraComponent } from '../components';

/**
 * The `CameraSystem` class manages the camera's
 * zooming and panning based on user inputs.
 */
export class CameraSystem extends System {
  private readonly _inputComponent: InputsComponent;
  private readonly _time: Time;

  /**
   * Constructs a new instance of the `CameraSystem` class.
   * @param inputEntity - The entity that contains the `InputsComponent`.
   * @param time - The `Time` instance for managing time-related operations.
   */
  constructor(inputEntity: Entity, time: Time) {
    super('camera', [CameraComponent.symbol, PositionComponent.symbol]);

    this._inputComponent = inputEntity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );
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

    if (cameraComponent.isStatic) {
      return;
    }

    const position = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );

    if (cameraComponent.allowZooming) {
      cameraComponent.zoom = math.clamp(
        cameraComponent.zoom -
          this._inputComponent.scrollDelta * cameraComponent.zoomSensitivity,
        cameraComponent.minZoom,
        cameraComponent.maxZoom,
      );
    }

    if (cameraComponent.allowPanning) {
      const zoomPanMultiplier =
        cameraComponent.panSensitivity *
        (1 / cameraComponent.zoom) *
        this._time.rawDeltaTimeInMilliseconds;

      if (this._inputComponent.keyPressed(keyCodes.w)) {
        position.y -= zoomPanMultiplier;
      }

      if (this._inputComponent.keyPressed(keyCodes.s)) {
        position.y += zoomPanMultiplier;
      }

      if (this._inputComponent.keyPressed(keyCodes.a)) {
        position.x -= zoomPanMultiplier;
      }

      if (this._inputComponent.keyPressed(keyCodes.d)) {
        position.x += zoomPanMultiplier;
      }
    }
  }
}
