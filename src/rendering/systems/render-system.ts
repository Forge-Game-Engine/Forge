import {
  type AnimationFrame,
  SpriteAnimationComponent,
} from '../../animations';
import {
  FlipComponent,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
} from '../../common';
import { Entity, System } from '../../ecs';
import {
  Batch,
  RenderableBatchComponent,
  SpriteComponent,
} from '../components';
import type { ForgeRenderLayer } from '../render-layers';
import { Renderable } from '../renderable';
import {
  BATCH_GROWTH_FACTOR,
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
} from './render-constants';

export interface RenderSystemOptions {
  layer: ForgeRenderLayer;
}

export class RenderSystem extends System {
  private readonly _layer: ForgeRenderLayer;
  private readonly _instanceBuffer: WebGLBuffer;

  constructor(options: RenderSystemOptions) {
    super('renderer', [RenderableBatchComponent.symbol]);

    const { layer } = options;
    this._layer = layer;

    this._instanceBuffer = layer.context.createBuffer()!;
    this._setupGLState();
  }

  public override beforeAll(entities: Entity[]) {
    this._layer.context.clear(this._layer.context.COLOR_BUFFER_BIT);

    return entities;
  }

  public run(entity: Entity): void {
    const batchComponent =
      entity.getComponentRequired<RenderableBatchComponent>(
        RenderableBatchComponent.symbol,
      );

    if (batchComponent.renderLayer !== this._layer) {
      return;
    }

    const gl = this._layer.context;

    for (const [renderable, batch] of batchComponent.batches) {
      this._includeBatch(renderable, batch, gl);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Called once at system stop to clear.
   */
  public override stop(): void {
    this._layer.context.clear(this._layer.context.COLOR_BUFFER_BIT);
  }

  private _setupGLState(): void {
    const gl = this._layer.context;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private _includeBatch(
    renderable: Renderable,
    batch: Batch,
    gl: WebGL2RenderingContext,
  ): void {
    const { entities } = batch;

    if (entities.length === 0) {
      return;
    }

    renderable.bind(gl);

    const requiredBatchSize = entities.length * FLOATS_PER_INSTANCE;

    if (!batch.instanceData || batch.instanceData.length < requiredBatchSize) {
      batch.instanceData = new Float32Array(
        requiredBatchSize * BATCH_GROWTH_FACTOR,
      );
    }

    for (let i = 0; i < entities.length; i++) {
      const batchedEntity = entities[i];
      const instanceDataOffset = i * FLOATS_PER_INSTANCE;

      const position = batchedEntity.getComponentRequired<PositionComponent>(
        PositionComponent.symbol,
      );
      const rotation = batchedEntity.getComponent<RotationComponent>(
        RotationComponent.symbol,
      );
      const scale = batchedEntity.getComponent<ScaleComponent>(
        ScaleComponent.symbol,
      );
      const spriteComponent =
        batchedEntity.getComponentRequired<SpriteComponent>(
          SpriteComponent.symbol,
        );
      const flipComponent = batchedEntity.getComponent<FlipComponent>(
        FlipComponent.symbol,
      );
      const spriteAnimationComponent =
        batchedEntity.getComponent<SpriteAnimationComponent>(
          SpriteAnimationComponent.symbol,
        );

      let animationFrame: AnimationFrame | null = null;

      if (spriteAnimationComponent) {
        const { currentAnimation, animationFrameIndex } =
          spriteAnimationComponent;

        animationFrame = currentAnimation.getFrame(animationFrameIndex);
      }

      this._populateInstanceData(batch.instanceData, instanceDataOffset, {
        position,
        rotation,
        scale,
        spriteComponent,
        flipComponent,
        animationFrame,
      });
    }

    // Upload instance transform buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.instanceData, gl.DYNAMIC_DRAW);

    this._setupInstanceAttributesAndDraw(gl, renderable, entities.length);
  }

  private _populateInstanceData(
    instanceData: Float32Array,
    offset: number,
    components: {
      position: PositionComponent;
      rotation: RotationComponent | null;
      scale: ScaleComponent | null;
      spriteComponent: SpriteComponent;
      flipComponent: FlipComponent | null;
      animationFrame?: AnimationFrame | null;
    },
  ): void {
    const {
      position,
      rotation,
      scale,
      spriteComponent,
      flipComponent,
      animationFrame,
    } = components;

    // Position
    instanceData[offset + POSITION_X_OFFSET] = position.x;
    instanceData[offset + POSITION_Y_OFFSET] = position.y;

    // Rotation
    instanceData[offset + ROTATION_OFFSET] = rotation?.radians ?? 0;

    // Scale with flip consideration
    instanceData[offset + SCALE_X_OFFSET] =
      (scale?.x ?? 1) * (flipComponent?.flipX ? -1 : 1);
    instanceData[offset + SCALE_Y_OFFSET] =
      (scale?.y ?? 1) * (flipComponent?.flipY ? -1 : 1);

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

  private _setupInstanceAttributesAndDraw(
    gl: WebGL2RenderingContext,
    renderable: Renderable,
    batchLength: number,
  ) {
    const program = renderable.material.program;
    // Attribute locations
    const posLoc = gl.getAttribLocation(program, 'a_instancePos');
    const rotLoc = gl.getAttribLocation(program, 'a_instanceRot');
    const scaleLoc = gl.getAttribLocation(program, 'a_instanceScale');
    const sizeLoc = gl.getAttribLocation(program, 'a_instanceSize');
    const pivotLoc = gl.getAttribLocation(program, 'a_instancePivot');
    const texOffsetLoc = gl.getAttribLocation(program, 'a_instanceTexOffset');
    const texSizeLoc = gl.getAttribLocation(program, 'a_instanceTexSize');

    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuffer);

    // a_instancePos (vec2) - offset 0
    this._setupInstanceAttributes(posLoc, gl, 2, POSITION_X_OFFSET);

    // a_instanceRot (float) - offset 2
    this._setupInstanceAttributes(rotLoc, gl, 1, ROTATION_OFFSET);

    // a_instanceScale (vec2) - offset 3
    this._setupInstanceAttributes(scaleLoc, gl, 2, SCALE_X_OFFSET);

    // a_instanceSize (vec2) - offset 5
    this._setupInstanceAttributes(sizeLoc, gl, 2, WIDTH_OFFSET);

    // a_instancePivot (vec2) - offset 7
    this._setupInstanceAttributes(pivotLoc, gl, 2, PIVOT_X_OFFSET);

    // a_instanceTexOffset (vec2) - offset 9
    this._setupInstanceAttributes(texOffsetLoc, gl, 2, TEX_OFFSET_X_OFFSET);

    // a_instanceTexSize (vec2) - offset 11
    this._setupInstanceAttributes(texSizeLoc, gl, 2, TEX_SIZE_X_OFFSET);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batchLength);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private _setupInstanceAttributes(
    attributeLocation: number,
    gl: WebGL2RenderingContext,
    numComponents: number,
    index: number,
  ) {
    if (attributeLocation === -1) {
      return;
    }

    gl.enableVertexAttribArray(attributeLocation);
    gl.vertexAttribPointer(
      attributeLocation,
      numComponents,
      gl.FLOAT,
      false,
      FLOATS_PER_INSTANCE * 4,
      index * 4,
    );
    gl.vertexAttribDivisor(attributeLocation, 1);
  }
}
