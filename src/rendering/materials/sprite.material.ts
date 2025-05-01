import { createTextureFromImage, ShaderStore } from '../shaders';
import { Material } from './material';

export class SpriteMaterial extends Material {
  public readonly albedoTexture: HTMLImageElement;

  constructor(
    gl: WebGL2RenderingContext,
    shaderStore: ShaderStore,
    albedoTexture: HTMLImageElement,
  ) {
    super('sprite.vert', 'sprite.frag', shaderStore, gl);

    this.albedoTexture = albedoTexture;

    this.setUniform('u_texture', createTextureFromImage(gl, albedoTexture));
  }
}
