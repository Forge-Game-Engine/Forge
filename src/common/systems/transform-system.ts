import { Entity, System } from '../../ecs';
import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
} from '../../common';

/**
 * System that manages the scale of entities with age
 */
export class TransformSystem extends System {
  /**
   * Creates an instance of TransformSystem.
   */
  constructor() {
    super('Transform', []);
  }

  /**
   * Updates the entity's scale based on its age, interpolating between the original scale and the lifetime scale reduction.
   * @param entity - The entity whose scale will be updated according to its age.
   */
  public run(entity: Entity): void {
    const positionComponent = entity.getComponent<PositionComponent>(
      PositionComponent.symbol,
    );

    const rotationComponent = entity.getComponent<RotationComponent>(
      RotationComponent.symbol,
    );

    const scaleComponent = entity.getComponent<ScaleComponent>(
      ScaleComponent.symbol,
    );

    const isRoot = entity.parent === null;

    if (isRoot) {
      if (positionComponent) {
        positionComponent.world.x = positionComponent.local.x;
        positionComponent.world.y = positionComponent.local.y;
      }

      if (rotationComponent) {
        rotationComponent.world = rotationComponent.local;
      }

      if (scaleComponent) {
        scaleComponent.world.x = scaleComponent.local.x;
        scaleComponent.world.y = scaleComponent.local.y;
      }

      return;
    }

    for (const child of entity.children) {
      const childPositionComponent = child.getComponent<PositionComponent>(
        PositionComponent.symbol,
      );
      const childRotationComponent = child.getComponent<RotationComponent>(
        RotationComponent.symbol,
      );
      const childScaleComponent = child.getComponent<ScaleComponent>(
        ScaleComponent.symbol,
      );

      // TODO: apply the parent's position, rotation and scale to the child's position, rotation and scale
    }
  }
}
