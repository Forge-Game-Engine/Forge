import { AnimationManager, ImageAnimationComponent } from '../../animations';
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

const FLOATS_PER_INSTANCE = 13;

export interface RenderSystemOptions {
  layer: ForgeRenderLayer;
  animationManager: AnimationManager;
}

export class RenderSystem extends System {
  private readonly _layer: ForgeRenderLayer;
  private readonly _instanceBuffer: WebGLBuffer;
  private readonly _animationManager: AnimationManager;

  constructor(options: RenderSystemOptions) {
    super('renderer', [RenderableBatchComponent.symbol]);

    const { layer, animationManager } = options;
    this._layer = layer;
    this._animationManager = animationManager;

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
      batch.instanceData = new Float32Array(requiredBatchSize * 1.25);
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

      const imageAnimationComponent =
        batchedEntity.getComponent<ImageAnimationComponent>(
          ImageAnimationComponent.symbol,
        );

      let currentFrame = null;

      if (imageAnimationComponent) {
        currentFrame = this._animationManager.getAnimationFrame(
          imageAnimationComponent?.entityType,
          imageAnimationComponent?.getCurrentAnimation(),
          imageAnimationComponent?.animationIndex,
        );
      }

      batch.instanceData[instanceDataOffset] = position.x;
      batch.instanceData[instanceDataOffset + 1] = position.y;
      batch.instanceData[instanceDataOffset + 2] = rotation?.radians ?? 0;
      batch.instanceData[instanceDataOffset + 3] =
        (scale?.x ?? 1) * (flipComponent?.flipX ? -1 : 1);
      batch.instanceData[instanceDataOffset + 4] =
        (scale?.y ?? 1) * (flipComponent?.flipY ? -1 : 1);
      batch.instanceData[instanceDataOffset + 5] = spriteComponent.sprite.width;
      batch.instanceData[instanceDataOffset + 6] =
        spriteComponent.sprite.height;
      batch.instanceData[instanceDataOffset + 7] =
        spriteComponent.sprite.pivot.x;
      batch.instanceData[instanceDataOffset + 8] =
        spriteComponent.sprite.pivot.y;
      batch.instanceData[instanceDataOffset + 9] = currentFrame?.offset.x ?? 0;
      batch.instanceData[instanceDataOffset + 10] = currentFrame?.offset.y ?? 0;
      batch.instanceData[instanceDataOffset + 11] = currentFrame?.scale.x ?? 1;
      batch.instanceData[instanceDataOffset + 12] = currentFrame?.scale.y ?? 1;
    }

    // Upload instance transform buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.instanceData, gl.DYNAMIC_DRAW);

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
    if (posLoc !== -1) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(
        posLoc,
        2,
        gl.FLOAT,
        false,
        FLOATS_PER_INSTANCE * 4,
        0,
      );
      gl.vertexAttribDivisor(posLoc, 1);
    }

    // a_instanceRot (float) - offset 2
    if (rotLoc !== -1) {
      gl.enableVertexAttribArray(rotLoc);
      gl.vertexAttribPointer(
        rotLoc,
        1,
        gl.FLOAT,
        false,
        FLOATS_PER_INSTANCE * 4,
        2 * 4,
      );
      gl.vertexAttribDivisor(rotLoc, 1);
    }

    // a_instanceScale (vec2) - offset 3
    if (scaleLoc !== -1) {
      gl.enableVertexAttribArray(scaleLoc);
      gl.vertexAttribPointer(
        scaleLoc,
        2,
        gl.FLOAT,
        false,
        FLOATS_PER_INSTANCE * 4,
        3 * 4,
      );
      gl.vertexAttribDivisor(scaleLoc, 1);
    }

    // a_instanceSize (vec2) - offset 5
    if (sizeLoc !== -1) {
      gl.enableVertexAttribArray(sizeLoc);
      gl.vertexAttribPointer(
        sizeLoc,
        2,
        gl.FLOAT,
        false,
        FLOATS_PER_INSTANCE * 4,
        5 * 4,
      );
      gl.vertexAttribDivisor(sizeLoc, 1);
    }

    // a_instancePivot (vec2) - offset 7
    if (pivotLoc !== -1) {
      gl.enableVertexAttribArray(pivotLoc);
      gl.vertexAttribPointer(
        pivotLoc,
        2,
        gl.FLOAT,
        false,
        FLOATS_PER_INSTANCE * 4,
        7 * 4,
      );
      gl.vertexAttribDivisor(pivotLoc, 1);
    }

    // a_instanceTexOffset (vec2) - offset 9
    if (texOffsetLoc !== -1) {
      gl.enableVertexAttribArray(texOffsetLoc);
      gl.vertexAttribPointer(
        texOffsetLoc,
        2,
        gl.FLOAT,
        false,
        FLOATS_PER_INSTANCE * 4,
        9 * 4,
      );
      gl.vertexAttribDivisor(texOffsetLoc, 1);
    }

    // a_instanceTexSize (vec2) - offset 11
    if (texSizeLoc !== -1) {
      gl.enableVertexAttribArray(texSizeLoc);
      gl.vertexAttribPointer(
        texSizeLoc,
        2,
        gl.FLOAT,
        false,
        FLOATS_PER_INSTANCE * 4,
        11 * 4,
      );
      gl.vertexAttribDivisor(texSizeLoc, 1);
    }

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, entities.length);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
}
