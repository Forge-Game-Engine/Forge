import {
  type AnimationFrame,
  SpriteAnimationComponent,
} from '../../animations/index.js';
import {
  FlipComponent,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
} from '../../common/index.js';
import type { Entity } from '../../ecs/index.js';
import { SpriteComponent } from '../components/index.js';
import type {
  InstanceAttributeSpec,
  InstanceDataPopulator,
} from './instance-data-populator.js';
import {
  FLOATS_PER_INSTANCE,
  HEIGHT_OFFSET,
  PIVOT_X_OFFSET,
  PIVOT_Y_OFFSET,
  POSITION_X_OFFSET,
  POSITION_Y_OFFSET,
  ROTATION_OFFSET,
  SCALE_X_OFFSET,
  SCALE_Y_OFFSET,
  TEX_OFFSET_X_OFFSET,
  TEX_OFFSET_Y_OFFSET,
  TEX_SIZE_X_OFFSET,
  TEX_SIZE_Y_OFFSET,
  WIDTH_OFFSET,
} from './render-constants.js';

/**
 * Instance data populator for sprite rendering.
 * Populates instance data with position, rotation, scale, size, pivot, and texture coordinates.
 */
export class SpriteInstanceDataPopulator implements InstanceDataPopulator {
  public readonly floatsPerInstance = FLOATS_PER_INSTANCE;

  public readonly attributeSpecs: InstanceAttributeSpec[] = [
    { name: 'a_instancePos', numComponents: 2, offset: POSITION_X_OFFSET },
    { name: 'a_instanceRot', numComponents: 1, offset: ROTATION_OFFSET },
    { name: 'a_instanceScale', numComponents: 2, offset: SCALE_X_OFFSET },
    { name: 'a_instanceSize', numComponents: 2, offset: WIDTH_OFFSET },
    { name: 'a_instancePivot', numComponents: 2, offset: PIVOT_X_OFFSET },
    {
      name: 'a_instanceTexOffset',
      numComponents: 2,
      offset: TEX_OFFSET_X_OFFSET,
    },
    { name: 'a_instanceTexSize', numComponents: 2, offset: TEX_SIZE_X_OFFSET },
  ];

  public populateInstanceData(
    instanceData: Float32Array,
    offset: number,
    entity: Entity,
  ): void {
    const position = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const rotation = entity.getComponent<RotationComponent>(
      RotationComponent.symbol,
    );
    const scale = entity.getComponent<ScaleComponent>(ScaleComponent.symbol);
    const spriteComponent = entity.getComponentRequired<SpriteComponent>(
      SpriteComponent.symbol,
    );
    const flipComponent = entity.getComponent<FlipComponent>(
      FlipComponent.symbol,
    );
    const spriteAnimationComponent =
      entity.getComponent<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );

    let animationFrame: AnimationFrame | null = null;

    if (spriteAnimationComponent) {
      const { currentAnimation, animationFrameIndex } =
        spriteAnimationComponent;

      animationFrame = currentAnimation.getFrame(animationFrameIndex);
    }

    // Position
    instanceData[offset + POSITION_X_OFFSET] = position.world.x;
    instanceData[offset + POSITION_Y_OFFSET] = position.world.y;

    // Rotation
    instanceData[offset + ROTATION_OFFSET] = rotation?.world ?? 0;

    // Scale with flip consideration
    instanceData[offset + SCALE_X_OFFSET] =
      (scale?.world.x ?? 1) * (flipComponent?.flipX ? -1 : 1);
    instanceData[offset + SCALE_Y_OFFSET] =
      (scale?.world.y ?? 1) * (flipComponent?.flipY ? -1 : 1);

    // Sprite dimensions
    instanceData[offset + WIDTH_OFFSET] = spriteComponent.sprite.width;
    instanceData[offset + HEIGHT_OFFSET] = spriteComponent.sprite.height;

    // Sprite pivot
    instanceData[offset + PIVOT_X_OFFSET] = spriteComponent.sprite.pivot.x;
    instanceData[offset + PIVOT_Y_OFFSET] = spriteComponent.sprite.pivot.y;

    // Texture coordinates (animation frame or defaults)
    instanceData[offset + TEX_OFFSET_X_OFFSET] = animationFrame?.offset.x ?? 0;
    instanceData[offset + TEX_OFFSET_Y_OFFSET] = animationFrame?.offset.y ?? 0;
    instanceData[offset + TEX_SIZE_X_OFFSET] = animationFrame?.scale.x ?? 1;
    instanceData[offset + TEX_SIZE_Y_OFFSET] = animationFrame?.scale.y ?? 1;
  }
}

/**
 * Default sprite instance data populator instance.
 * Can be shared across multiple renderables that use the standard sprite shader.
 */
export const defaultSpriteInstanceDataPopulator =
  new SpriteInstanceDataPopulator();
