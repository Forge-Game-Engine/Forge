import { PositionComponent } from '../../common/index.js';
import { Entity } from '../../ecs/index.js';
import { CameraComponent } from '../components/index.js';
import {
  createProjectionMatrix,
  createTextureFromImage,
} from '../shaders/index.js';
import { Material } from './material.js';

// TODO - separate the material and instance of a material. Material is just the shaders.
// Instance holds uniforms, textures, etc.
export class SpriteMaterial extends Material {
  public readonly albedoTexture: HTMLImageElement;
  public readonly cameraEntity: Entity;

  constructor(
    gl: WebGL2RenderingContext,
    // TODO - Concrete Materials like the SpriteMaterial should look up their shaders from the renderContext, does this break the dependency inversion principle?
    // Maybe these concrete classes should just be instances that take in the shaders?
    vertexShaderSource: string,
    fragmentShaderSource: string,
    albedoTexture: HTMLImageElement,
    cameraEntity: Entity,
  ) {
    super(vertexShaderSource, fragmentShaderSource, gl);

    this.albedoTexture = albedoTexture;

    this.setUniform('u_texture', createTextureFromImage(gl, albedoTexture));
    this.cameraEntity = cameraEntity;
  }

  protected beforeBind(gl: WebGL2RenderingContext): void {
    const cameraPosition =
      this.cameraEntity.getComponentRequired(PositionComponent);
    const camera = this.cameraEntity.getComponentRequired(CameraComponent);

    this.setUniform(
      'u_projection',
      createProjectionMatrix(
        gl.canvas.width,
        gl.canvas.height,
        cameraPosition.world,
        camera.zoom,
      ),
    );
  }
}
