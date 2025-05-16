import { PositionComponent } from '../../common';
import { Entity, System } from '../../ecs';
import { RenderableBatchComponent } from '../components';
import { Matrix3x3, Vector2 } from '../../math';
import { createProjectionMatrix } from '../shaders';
import { CameraComponent } from '../components';
import type { ForgeRenderLayer } from '../render-layers';

const FLOATS_PER_MATRIX = 9;

export interface RenderSystemOptions {
  layer: ForgeRenderLayer;
  cameraEntity: Entity;
}

export class RenderSystem extends System {
  private _layer: ForgeRenderLayer;
  private _camera: CameraComponent;
  private _cameraPosition: Vector2;
  private _instanceBuffer: WebGLBuffer;

  constructor(options: RenderSystemOptions) {
    super('renderer', [RenderableBatchComponent.symbol]);

    const { layer, cameraEntity } = options;
    this._layer = layer;

    const cameraPosition = cameraEntity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const camera = cameraEntity.getComponentRequired<CameraComponent>(
      CameraComponent.symbol,
    );

    this._camera = camera;
    this._cameraPosition = cameraPosition;

    this._instanceBuffer = layer.context.createBuffer()!;
    this._setupGLState();
  }

  private _setupGLState(): void {
    const gl = this._layer.context;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
      if (batch.length === 0) {
        continue;
      }

      renderable.bind(gl);

      const instanceData = new Float32Array(batch.length * FLOATS_PER_MATRIX);

      for (let i = 0; i < batch.length; i++) {
        const { position, rotation, scale, height, width, pivot } = batch[i]!;

        const mat = this._getSpriteMatrix(
          position,
          rotation?.radians ?? 0,
          width,
          height,
          scale ?? Vector2.one,
          pivot,
        );

        for (let j = 0; j < FLOATS_PER_MATRIX; j++) {
          instanceData[i * FLOATS_PER_MATRIX + j] = mat.matrix[j]!;
        }
      }

      // Upload instance transform buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

      const program = renderable.material.program;

      const baseLocation = gl.getAttribLocation(program, 'a_instanceMatrix');

      if (baseLocation === -1) {
        console.error('a_instanceMatrix not found!');
      } else {
        for (let i = 0; i < 3; i++) {
          const loc = baseLocation + i;

          gl.enableVertexAttribArray(loc);
          gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuffer);
          gl.vertexAttribPointer(
            loc,
            3,
            gl.FLOAT,
            false,
            FLOATS_PER_MATRIX * 4,
            i * 3 * 4,
          );
          gl.vertexAttribDivisor(loc, 1);
        }
      }

      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batch.length);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Called once at system stop to clear.
   */
  public override stop(): void {
    this._layer.context.clear(this._layer.context.COLOR_BUFFER_BIT);
  }

  /**
   * Builds a column-major 3x3 matrix for each sprite instance
   * (projection -> translation -> rotation -> scale -> pivot).
   */
  private _getSpriteMatrix(
    position: Vector2,
    rotation: number,
    spriteWidth: number,
    spriteHeight: number,
    scale: Vector2,
    pivot: Vector2,
  ): Matrix3x3 {
    const { width, height } = this._layer.canvas;
    const { x: camX, y: camY } = this._cameraPosition;
    const zoom = this._camera.zoom;

    // Start with a standard projection:
    const matrix = createProjectionMatrix(width, height); // TODO: cache this somewhere, but also remember to update it if canvas size changes

    // 1) Translate so screen center becomes the new origin
    // TODO: not sure what this does because it uses the width and height of the canvas
    // and not the sprite/camera coordinates. Might be cachable, might be able to
    // remove it entirely and just set it in the projection matrix.
    matrix.translate(width / 2, height / 2);

    // 2) Scale around that center
    matrix.scale(zoom, zoom);

    // 3) Translate back so that (0, 0) again refers to the top-left corner,
    //    but now any scaling has happened around the screen center
    matrix.translate(-width / 2, -height / 2);

    // 4) Apply camera offset (so that cameraPosition is centered on screen)
    matrix.translate(-camX + width / 2, camY + height / 2);

    // 5) Now place this particular sprite
    matrix.translate(position.x, position.y);
    matrix.rotate(rotation);
    matrix.scale(spriteWidth * scale.x, spriteHeight * scale.y);

    // 6) Finally apply sprite pivot if needed
    matrix.translate(-pivot.x, -pivot.y);

    return matrix;
  }
}
