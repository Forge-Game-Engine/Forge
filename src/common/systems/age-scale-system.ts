import { Entity, System } from '../../ecs';
import { ScaleComponent } from '../../common';
import { AgeComponent } from '../../common/components/age-component';
import { AgeScaleComponent } from '../components/age-scale-component';

/**
 * System that manages the scale of entities with age
 */
export class AgeScaleSystem extends System {
  /**
   * Creates an instance of AgeScaleSystem.
   */
  constructor() {
    super('AgeScale', [
      AgeComponent.symbol,
      ScaleComponent.symbol,
      AgeScaleComponent.symbol,
    ]);
  }

  /**
   * Runs the age system for a given entity, removing it if its age exceeds its lifetime.
   * @param entity - The entity to update the age for.
   */
  public run(entity: Entity): void {
    const ageComponent = entity.getComponentRequired<AgeComponent>(
      AgeComponent.symbol,
    );
    const scaleComponent = entity.getComponentRequired<ScaleComponent>(
      ScaleComponent.symbol,
    );
    const ageScaleComponent = entity.getComponentRequired<AgeScaleComponent>(
      AgeScaleComponent.symbol,
    );

    const ageRatio = ageComponent.ageSeconds / ageComponent.lifetimeSeconds;
    const newScale =
      ageScaleComponent.originalScale * (1 - ageRatio) +
      ageScaleComponent.lifetimeScaleReduction * ageRatio;
    scaleComponent.x = newScale;
    scaleComponent.y = newScale;
  }
}
