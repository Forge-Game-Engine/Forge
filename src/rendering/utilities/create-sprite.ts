import {
  AnimationFrame,
  SpriteAnimationComponent,
} from '../../animations/index.js';
import {
  FlipComponent,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
} from '../../common/index.js';
import { Entity } from '../../ecs/entity.js';
import { SpriteComponent } from '../components/sprite-component.js';
import { createQuadGeometry } from '../geometry/index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { Renderable } from '../renderable.js';
import { Sprite } from '../sprite.js';
import {
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
  TINT_COLOR_A_OFFSET,
  TINT_COLOR_B_OFFSET,
  TINT_COLOR_G_OFFSET,
  TINT_COLOR_R_OFFSET,
  WIDTH_OFFSET,
} from '../systems/render-constants.js';
import { setupInstanceAttribute } from './setup-instance-attribute.js';

const floatsPerInstance = 17;

function bindInstanceData(
  entity: Entity,
  instanceDataBufferArray: Float32Array,
  offset: number,
) {
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
    const { stateMachine, animationFrameIndex } = spriteAnimationComponent;

    animationFrame = stateMachine.currentState.getFrame(animationFrameIndex);
  }

  // Position
  instanceDataBufferArray[offset + POSITION_X_OFFSET] = position.world.x;
  instanceDataBufferArray[offset + POSITION_Y_OFFSET] = position.world.y;

  // Rotation
  instanceDataBufferArray[offset + ROTATION_OFFSET] = rotation?.world ?? 0;

  // Scale with flip consideration
  instanceDataBufferArray[offset + SCALE_X_OFFSET] =
    (scale?.world.x ?? 1) * (flipComponent?.flipX ? -1 : 1);
  instanceDataBufferArray[offset + SCALE_Y_OFFSET] =
    (scale?.world.y ?? 1) * (flipComponent?.flipY ? -1 : 1);

  // Sprite dimensions
  instanceDataBufferArray[offset + WIDTH_OFFSET] = spriteComponent.sprite.width;
  instanceDataBufferArray[offset + HEIGHT_OFFSET] =
    spriteComponent.sprite.height;

  // Sprite pivot
  instanceDataBufferArray[offset + PIVOT_X_OFFSET] =
    spriteComponent.sprite.pivot.x;
  instanceDataBufferArray[offset + PIVOT_Y_OFFSET] =
    spriteComponent.sprite.pivot.y;

  // Texture coordinates (animation frame or defaults)
  instanceDataBufferArray[offset + TEX_OFFSET_X_OFFSET] =
    animationFrame?.offset.x ?? 0;
  instanceDataBufferArray[offset + TEX_OFFSET_Y_OFFSET] =
    animationFrame?.offset.y ?? 0;
  instanceDataBufferArray[offset + TEX_SIZE_X_OFFSET] =
    animationFrame?.dimensions.x ?? 1;
  instanceDataBufferArray[offset + TEX_SIZE_Y_OFFSET] =
    animationFrame?.dimensions.y ?? 1;

  // Tint color
  instanceDataBufferArray[offset + TINT_COLOR_R_OFFSET] =
    spriteComponent.sprite.tintColor.r;
  instanceDataBufferArray[offset + TINT_COLOR_G_OFFSET] =
    spriteComponent.sprite.tintColor.g;
  instanceDataBufferArray[offset + TINT_COLOR_B_OFFSET] =
    spriteComponent.sprite.tintColor.b;
  instanceDataBufferArray[offset + TINT_COLOR_A_OFFSET] =
    spriteComponent.sprite.tintColor.a;
}

function setupInstanceAttributes(
  gl: WebGL2RenderingContext,
  renderable: Renderable,
): void {
  const program = renderable.material.program;
  // Attribute locations
  const posLoc = gl.getAttribLocation(program, 'a_instancePos');
  const rotLoc = gl.getAttribLocation(program, 'a_instanceRot');
  const scaleLoc = gl.getAttribLocation(program, 'a_instanceScale');
  const sizeLoc = gl.getAttribLocation(program, 'a_instanceSize');
  const pivotLoc = gl.getAttribLocation(program, 'a_instancePivot');
  const texOffsetLoc = gl.getAttribLocation(program, 'a_instanceTexOffset');
  const texSizeLoc = gl.getAttribLocation(program, 'a_instanceTexSize');
  const tintColorLoc = gl.getAttribLocation(program, 'a_instanceTint');

  const stride = floatsPerInstance * 4; // 17 floats per instance, 4 bytes each

  // a_instancePos (vec2) - offset 0
  setupInstanceAttribute(posLoc, gl, 2, stride, POSITION_X_OFFSET * 4);

  // a_instanceRot (float) - offset 2
  setupInstanceAttribute(rotLoc, gl, 1, stride, ROTATION_OFFSET * 4);

  // a_instanceScale (vec2) - offset 3
  setupInstanceAttribute(scaleLoc, gl, 2, stride, SCALE_X_OFFSET * 4);

  // a_instanceSize (vec2) - offset 5
  setupInstanceAttribute(sizeLoc, gl, 2, stride, WIDTH_OFFSET * 4);

  // a_instancePivot (vec2) - offset 7
  setupInstanceAttribute(pivotLoc, gl, 2, stride, PIVOT_X_OFFSET * 4);

  // a_instanceTexOffset (vec2) - offset 9
  setupInstanceAttribute(texOffsetLoc, gl, 2, stride, TEX_OFFSET_X_OFFSET * 4);

  // a_instanceTexSize (vec2) - offset 11
  setupInstanceAttribute(texSizeLoc, gl, 2, stride, TEX_SIZE_X_OFFSET * 4);

  // a_instanceTint (vec4) - offset 13
  setupInstanceAttribute(tintColorLoc, gl, 4, stride, TINT_COLOR_R_OFFSET * 4);
}

/**
 * Creates a sprite using the provided material and render context.
 * @param material - The material to use for the sprite.
 * @param renderContext - The render context to be used.
 * @param cameraEntity - The camera entity for the renderable.
 * @param width - The width of the sprite.
 * @param height - The height of the sprite.
 * @returns The created sprite.
 */
export function createSprite(
  material: Material,
  renderContext: RenderContext,
  cameraEntity: Entity,
  width: number,
  height: number,
): Sprite {
  const renderable = new Renderable(
    createQuadGeometry(renderContext.gl),
    material,
    cameraEntity,
    floatsPerInstance,
    bindInstanceData,
    setupInstanceAttributes,
  );

  const sprite = new Sprite({
    renderable,
    width,
    height,
  });

  return sprite;
}
