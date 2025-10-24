import { Entity, System } from '../../ecs/index.js';
import { ScaleComponent } from '../../common/index.js';
import { LifetimeComponent } from '../../lifecycle/components/lifetime-component.js';
import { AgeScaleComponent } from '../components/age-scale-component.js';

/**
 * System that manages the scale of entities with lifetime
 */
export class AgeScaleSystem extends System {
  /**
   * Creates an instance of AgeScaleSystem.
   */
  constructor() {
    super('AgeScale', [
      LifetimeComponent.symbol,
      ScaleComponent.symbol,
      AgeScaleComponent.symbol,
    ]);
  }

  /**
   * Updates the entity's scale based on its lifetime, interpolating between the original scale and the lifetime scale reduction.
   * @param entity - The entity whose scale will be updated according to its lifetime.
   */
  public run(entity: Entity): void {
    const lifetimeComponent = entity.getComponentRequired<LifetimeComponent>(
      LifetimeComponent.symbol,
    );
    const scaleComponent = entity.getComponentRequired<ScaleComponent>(
      ScaleComponent.symbol,
    );
    const ageScaleComponent = entity.getComponentRequired<AgeScaleComponent>(
      AgeScaleComponent.symbol,
    );

    const lifetimeRatio =
      lifetimeComponent.elapsedSeconds / lifetimeComponent.durationSeconds;
    const newScaleX =
      ageScaleComponent.originalScaleX * (1 - lifetimeRatio) +
      ageScaleComponent.finalLifetimeScaleX * lifetimeRatio;
    const newScaleY =
      ageScaleComponent.originalScaleY * (1 - lifetimeRatio) +
      ageScaleComponent.finalLifetimeScaleY * lifetimeRatio;
    scaleComponent.local.x = newScaleX;
    scaleComponent.local.y = newScaleY;
  }
}
