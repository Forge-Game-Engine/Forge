import { Entity, System } from '../../ecs';
import {
  AgeComponent,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  SpeedComponent,
  Time,
} from '../../common';
import { ParticleComponent } from '../';
/**
 * System that manages and updates particles.
 */
export class ParticleUpdateSystem extends System {
  private readonly _time: Time;
  /**
   * Creates an instance of ParticleUpdateSystem.
   * @param time - The Time instance.
   */
  constructor(time: Time) {
    super('particleUpdate', [
      ParticleComponent.symbol,
      AgeComponent.symbol,
      PositionComponent.symbol,
      RotationComponent.symbol,
      ScaleComponent.symbol,
      SpeedComponent.symbol,
    ]);
    this._time = time;
  }

  /**
   * Runs the animation system for a given entity.
   * @param entity - The entity to update animations for.
   */
  public run(entity: Entity): void {
    const particleComponent = entity.getComponentRequired<ParticleComponent>(
      ParticleComponent.symbol,
    );
    const ageComponent = entity.getComponentRequired<AgeComponent>(
      AgeComponent.symbol,
    );
    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const rotationComponent = entity.getComponentRequired<RotationComponent>(
      RotationComponent.symbol,
    );
    const scaleComponent = entity.getComponentRequired<ScaleComponent>(
      ScaleComponent.symbol,
    );
    const speedComponent = entity.getComponentRequired<SpeedComponent>(
      SpeedComponent.symbol,
    );

    rotationComponent.radians +=
      particleComponent.rotationSpeed * this._time.deltaTimeInSeconds;

    positionComponent.x +=
      speedComponent.speed *
      this._time.deltaTimeInSeconds *
      Math.sin(rotationComponent.radians);
    positionComponent.y -=
      speedComponent.speed *
      this._time.deltaTimeInSeconds *
      Math.cos(rotationComponent.radians);

    const ageRatio = ageComponent.ageSeconds / ageComponent.lifetimeSeconds;
    const newScale =
      particleComponent.originalScale * (1 - ageRatio) +
      particleComponent.lifetimeScaleReduction * ageRatio;
    scaleComponent.x = newScale;
    scaleComponent.y = newScale;
  }
}
