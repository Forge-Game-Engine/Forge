import * as forge from '../../../../src';
import { ShipComponent } from '../components';

export class ShipMovementSystem extends forge.System {
  private _inputComponent: forge.InputsComponent;
  private _time: forge.Time;

  constructor(inputsEntity: forge.Entity, time: forge.Time) {
    super('ship-movement', [
      ShipComponent.symbol,
      forge.PositionComponent.symbol,
      forge.RotationComponent.symbol,
    ]);

    const inputComponent =
      inputsEntity.getComponentRequired<forge.InputsComponent>(
        forge.InputsComponent.symbol,
      );

    this._inputComponent = inputComponent;
    this._time = time;
  }

  public run(entity: forge.Entity): void {
    const player = entity.getComponentRequired<ShipComponent>(
      ShipComponent.symbol,
    );

    const position = entity.getComponentRequired<forge.PositionComponent>(
      forge.PositionComponent.symbol,
    );

    const rotation = entity.getComponentRequired<forge.RotationComponent>(
      forge.RotationComponent.symbol,
    );

    const forwardVector = new forge.Vector2(
      Math.sin(rotation.radians),
      -Math.cos(rotation.radians),
    );

    if (this._inputComponent.keyPressed(forge.keyCodes.arrowUp)) {
      position.x += forwardVector.x * player.speed * this._time.deltaTime;
      position.y += forwardVector.y * player.speed * this._time.deltaTime;
    }

    if (this._inputComponent.keyPressed(forge.keyCodes.arrowDown)) {
      position.x -= forwardVector.x * player.speed * this._time.deltaTime;
      position.y -= forwardVector.y * player.speed * this._time.deltaTime;
    }

    if (this._inputComponent.keyPressed(forge.keyCodes.arrowLeft)) {
      rotation.radians -= (player.rotationSpeed / 100) * this._time.deltaTime;
    }

    if (this._inputComponent.keyPressed(forge.keyCodes.arrowRight)) {
      rotation.radians += (player.rotationSpeed / 100) * this._time.deltaTime;
    }
  }
}
