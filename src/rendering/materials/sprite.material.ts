import { PositionComponent } from '../../common';
import { Entity } from '../../ecs';
import { CameraComponent } from '../components';
import {
  createProjectionMatrix,
  createTextureFromImage,
  ShaderStore,
} from '../shaders';
import { Material } from './material';

export class SpriteMaterial extends Material {
  public readonly albedoTexture: HTMLImageElement;
  public readonly cameraEntity: Entity;

  constructor(
    gl: WebGL2RenderingContext,
    shaderStore: ShaderStore,
    albedoTexture: HTMLImageElement,
    cameraEntity: Entity,
  ) {
    super('sprite.vert', 'sprite.frag', shaderStore, gl);

    this.albedoTexture = albedoTexture;

    this.setUniform('u_texture', createTextureFromImage(gl, albedoTexture));
    this.cameraEntity = cameraEntity;
  }

  protected beforeBind(gl: WebGL2RenderingContext): void {
    const cameraPosition =
      this.cameraEntity.getComponentRequired<PositionComponent>(
        PositionComponent.symbol,
      );
    const camera = this.cameraEntity.getComponentRequired<CameraComponent>(
      CameraComponent.symbol,
    );

    this.setUniform(
      'u_projection',
      createProjectionMatrix(
        gl.canvas.width,
        gl.canvas.height,
        cameraPosition.world,
        camera.zoom,
      ).data,
    );
  }
}
