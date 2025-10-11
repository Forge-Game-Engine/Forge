import { Entity, System } from '../../ecs';
import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  WorldPositionComponent,
  WorldRotationComponent,
  WorldScaleComponent,
} from '../components';

/**
 * System that manages entity transforms in a parent-child hierarchy.
 * Computes world transforms by combining parent transforms with local transforms.
 */
export class TransformSystem extends System {
  /**
   * Creates an instance of TransformSystem.
   */
  constructor() {
    super('Transform', [PositionComponent.symbol]);
  }

  /**
   * Runs the transform system for a given entity, computing its world transform.
   * @param entity - The entity to compute the world transform for.
   */
  public run(entity: Entity): void {
    // Get or create world transform components
    let worldPosition = entity.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );
    let worldRotation = entity.getComponent<WorldRotationComponent>(
      WorldRotationComponent.symbol,
    );
    let worldScale = entity.getComponent<WorldScaleComponent>(
      WorldScaleComponent.symbol,
    );

    // Create world components if they don't exist
    if (!worldPosition) {
      worldPosition = new WorldPositionComponent();

      entity.addComponents(worldPosition);
    }

    if (!worldRotation) {
      worldRotation = new WorldRotationComponent();

      entity.addComponents(worldRotation);
    }

    if (!worldScale) {
      worldScale = new WorldScaleComponent();

      entity.addComponents(worldScale);
    }

    // Get local transform components
    const localPosition = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const localRotation = entity.getComponent<RotationComponent>(
      RotationComponent.symbol,
    );
    const localScale = entity.getComponent<ScaleComponent>(
      ScaleComponent.symbol,
    );

    // Default values
    const localRotRadians = localRotation?.radians ?? 0;
    const localScaleX = localScale?.x ?? 1;
    const localScaleY = localScale?.y ?? 1;

    // If entity has no parent, world transform equals local transform
    if (!entity.parent) {
      worldPosition.x = localPosition.x;
      worldPosition.y = localPosition.y;
      worldRotation.radians = localRotRadians;
      worldScale.x = localScaleX;
      worldScale.y = localScaleY;

      return;
    }

    // Get parent's world transform
    const parentWorldPosition =
      entity.parent.getComponent<WorldPositionComponent>(
        WorldPositionComponent.symbol,
      );
    const parentWorldRotation =
      entity.parent.getComponent<WorldRotationComponent>(
        WorldRotationComponent.symbol,
      );
    const parentWorldScale = entity.parent.getComponent<WorldScaleComponent>(
      WorldScaleComponent.symbol,
    );

    // If parent doesn't have world transforms yet, use defaults (shouldn't happen if system runs in order)
    const parentPosX = parentWorldPosition?.x ?? 0;
    const parentPosY = parentWorldPosition?.y ?? 0;
    const parentRot = parentWorldRotation?.radians ?? 0;
    const parentScaleX = parentWorldScale?.x ?? 1;
    const parentScaleY = parentWorldScale?.y ?? 1;

    // Combine transformations: world = parent * local
    // For 2D transforms, we can extract the components directly
    // Combined rotation is sum of rotations
    worldRotation.radians = parentRot + localRotRadians;

    // Combined scale is product of scales
    worldScale.x = parentScaleX * localScaleX;
    worldScale.y = parentScaleY * localScaleY;

    // Combined position needs to account for parent's rotation and scale
    // Transform local position by parent's rotation and scale
    const cos = Math.cos(parentRot);
    const sin = Math.sin(parentRot);
    const scaledX = localPosition.x * parentScaleX;
    const scaledY = localPosition.y * parentScaleY;

    worldPosition.x = parentPosX + (scaledX * cos - scaledY * sin);
    worldPosition.y = parentPosY + (scaledX * sin + scaledY * cos);
  }
}
