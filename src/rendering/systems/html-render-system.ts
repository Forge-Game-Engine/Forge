import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
} from '../../common';
import { Entity, System } from '../../ecs';
import { CameraComponent, HtmlSpriteComponent } from '../components';
import type { HtmlForgeRenderLayer } from '../render-layers';

export interface HtmlRenderSystemOptions {
  layer: HtmlForgeRenderLayer;
}

export class HtmlRenderSystem extends System {
  private readonly _layer: HtmlForgeRenderLayer;
  private readonly _camera: CameraComponent;
  private readonly _cameraPosition: PositionComponent;

  constructor(options: HtmlRenderSystemOptions, cameraEntity: Entity) {
    super('html-renderer', [
      HtmlSpriteComponent.symbol,
      PositionComponent.symbol,
    ]);

    const { layer } = options;
    this._layer = layer;

    this._camera = cameraEntity.getComponentRequired<CameraComponent>(
      CameraComponent.symbol,
    );
    this._cameraPosition = cameraEntity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
  }

  public beforeAll(entities: Entity[]): Entity[] {
    const context = this._layer.context;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    return entities;
  }

  public run(entity: Entity): void {
    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );

    const spriteComponent = entity.getComponentRequired<HtmlSpriteComponent>(
      HtmlSpriteComponent.symbol,
    );
    const rotationComponent = entity.getComponent<RotationComponent>(
      RotationComponent.symbol,
    );
    const scaleComponent = entity.getComponent<ScaleComponent>(
      ScaleComponent.symbol,
    );

    const context = this._layer.context;

    // Save context state
    context.save();

    // Apply camera transform (move world relative to camera) and zoom
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.scale(this._camera.zoom, this._camera.zoom);
    context.translate(-this._cameraPosition.x, -this._cameraPosition.y);

    // Move to sprite position
    context.translate(positionComponent.x, positionComponent.y);

    // Apply rotation if present
    if (rotationComponent) {
      context.rotate(rotationComponent.radians);
    }

    // Apply scale if present
    if (scaleComponent) {
      context.scale(scaleComponent.x, scaleComponent.y);
    }

    // Draw image with pivot adjustment
    context.drawImage(
      spriteComponent.image,
      -spriteComponent.pivot.x * spriteComponent.width,
      -spriteComponent.pivot.y * spriteComponent.height,
    );

    // Restore context state
    context.restore();
  }
}
