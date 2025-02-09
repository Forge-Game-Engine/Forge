import { PositionComponent, Time } from '../../common';
import * as math from '../../math';
import { Entity, System } from '../../ecs';
import { InputsComponent, keyCodes } from '../../input';
import { CameraComponent } from '../components';

export class CameraSystem extends System {
  private _inputComponent: InputsComponent;
  private _time: Time;

  constructor(inputEntity: Entity, time: Time) {
    super('camera', [CameraComponent.symbol, PositionComponent.symbol]);

    this._inputComponent = inputEntity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );
    this._time = time;
  }

  public run = async (entity: Entity): Promise<void> => {
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
        cameraComponent.panSensitivity * (1 / cameraComponent.zoom) +
        this._time.rawDeltaTime;

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
  };
}
