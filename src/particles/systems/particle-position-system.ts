import { Entity, System } from '../../ecs/index.js';
import {
  PositionComponent,
  RotationComponent,
  SpeedComponent,
  Time,
} from '../../common/index.js';
import { ParticleComponent } from '../index.js';
/**
 * System that manages and updates particle position.
 */
export class ParticlePositionSystem extends System {
  private readonly _time: Time;
  /**
   * Creates an instance of ParticlePositionSystem.
   * @param time - The Time instance.
   */
  constructor(time: Time) {
    super('particlePosition', [
      ParticleComponent.symbol,
      PositionComponent.symbol,
      RotationComponent.symbol,
      SpeedComponent.symbol,
    ]);
    this._time = time;
  }

  /**
   * Runs the particle position system for a given entity.
   * This method updates the rotation based on the particle's rotation speed,
   * and updates the position based on the speed and rotation.
   * @param entity - The entity to update particle position for.
   */
  public run(entity: Entity): void {
    const particleComponent = entity.getComponentRequired<ParticleComponent>(
      ParticleComponent.symbol,
    );
    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const rotationComponent = entity.getComponentRequired<RotationComponent>(
      RotationComponent.symbol,
    );
    const speedComponent = entity.getComponentRequired<SpeedComponent>(
      SpeedComponent.symbol,
    );

    positionComponent.local.x +=
      speedComponent.speed *
      this._time.deltaTimeInSeconds *
      Math.sin(rotationComponent.local);
    positionComponent.local.y -=
      speedComponent.speed *
      this._time.deltaTimeInSeconds *
      Math.cos(rotationComponent.local);

    rotationComponent.local +=
      particleComponent.rotationSpeed * this._time.deltaTimeInSeconds;
  }
}
