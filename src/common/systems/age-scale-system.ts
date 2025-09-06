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
   * Updates the entity's scale based on its age, interpolating between the original scale and the lifetime scale reduction.
   * @param entity - The entity whose scale will be updated according to its age.
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
    const newScaleX =
      ageScaleComponent.originalScaleX * (1 - ageRatio) +
      ageScaleComponent.finalLifetimeScaleX * ageRatio;
    const newScaleY =
      ageScaleComponent.originalScaleY * (1 - ageRatio) +
      ageScaleComponent.finalLifetimeScaleY * ageRatio;
    scaleComponent.x = newScaleX;
    scaleComponent.y = newScaleY;
  }
}
