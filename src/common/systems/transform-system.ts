import { Entity, System } from 'forge/ecs';
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
   * Updates the entity's world transform based on its parent's world transform and its local transform.
   * @param entity - The entity whose world transform will be updated.
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

    const parent = entity.parent;

    if (parent === null) {
      this._applyLocalToWorld(
        positionComponent,
        rotationComponent,
        scaleComponent,
      );
    } else {
      this._applyParentTransform(
        parent,
        positionComponent,
        rotationComponent,
        scaleComponent,
      );
    }
  }

  /**
   * Copies local transform to world transform for root entities.
   */
  private _applyLocalToWorld(
    positionComponent: PositionComponent | null,
    rotationComponent: RotationComponent | null,
    scaleComponent: ScaleComponent | null,
  ): void {
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
  }

  /**
   * Applies parent's world transform to child's local transform to compute child's world transform.
   */
  private _applyParentTransform(
    parent: Entity,
    positionComponent: PositionComponent | null,
    rotationComponent: RotationComponent | null,
    scaleComponent: ScaleComponent | null,
  ): void {
    const parentPosition = parent.getComponent<PositionComponent>(
      PositionComponent.symbol,
    );
    const parentRotation = parent.getComponent<RotationComponent>(
      RotationComponent.symbol,
    );
    const parentScale = parent.getComponent<ScaleComponent>(
      ScaleComponent.symbol,
    );

    this._applyParentRotation(rotationComponent, parentRotation);
    this._applyParentScale(scaleComponent, parentScale);
    this._applyParentPosition(
      positionComponent,
      parentPosition,
      parentRotation,
      parentScale,
    );
  }

  /**
   * Applies parent rotation to child rotation.
   */
  private _applyParentRotation(
    rotationComponent: RotationComponent | null,
    parentRotation: RotationComponent | null,
  ): void {
    if (rotationComponent) {
      const parentWorldRotation = parentRotation ? parentRotation.world : 0;
      rotationComponent.world = parentWorldRotation + rotationComponent.local;
    }
  }

  /**
   * Applies parent scale to child scale.
   */
  private _applyParentScale(
    scaleComponent: ScaleComponent | null,
    parentScale: ScaleComponent | null,
  ): void {
    if (scaleComponent) {
      const parentWorldScaleX = parentScale ? parentScale.world.x : 1;
      const parentWorldScaleY = parentScale ? parentScale.world.y : 1;
      scaleComponent.world.x = parentWorldScaleX * scaleComponent.local.x;
      scaleComponent.world.y = parentWorldScaleY * scaleComponent.local.y;
    }
  }

  /**
   * Applies parent transform to child position.
   */
  private _applyParentPosition(
    positionComponent: PositionComponent | null,
    parentPosition: PositionComponent | null,
    parentRotation: RotationComponent | null,
    parentScale: ScaleComponent | null,
  ): void {
    if (!positionComponent) {
      return;
    }

    const parentWorldPosX = parentPosition ? parentPosition.world.x : 0;
    const parentWorldPosY = parentPosition ? parentPosition.world.y : 0;
    const parentWorldRotation = parentRotation ? parentRotation.world : 0;
    const parentWorldScaleX = parentScale ? parentScale.world.x : 1;
    const parentWorldScaleY = parentScale ? parentScale.world.y : 1;

    const scaledLocalX = positionComponent.local.x * parentWorldScaleX;
    const scaledLocalY = positionComponent.local.y * parentWorldScaleY;

    const cos = Math.cos(parentWorldRotation);
    const sin = Math.sin(parentWorldRotation);
    const rotatedX = scaledLocalX * cos - scaledLocalY * sin;
    const rotatedY = scaledLocalX * sin + scaledLocalY * cos;

    positionComponent.world.x = parentWorldPosX + rotatedX;
    positionComponent.world.y = parentWorldPosY + rotatedY;
  }
}
