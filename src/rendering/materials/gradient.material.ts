import { Vector2 } from '../../math';
import { createTextureFromImage, ShaderStore } from '../shaders';
import { Material } from './material';

export class GradientMaterial extends Material {
  public readonly gradientTexture: HTMLImageElement;

  constructor(
    gl: WebGL2RenderingContext,
    shaderStore: ShaderStore,
    resolution: Vector2,
    gradientTexture: HTMLImageElement,
    center: Vector2 = new Vector2(0.5, 0.5),
  ) {
    super('sprite.vert', 'radialGradient.frag', shaderStore, gl);

    this.setUniform(
      'u_resolution',
      new Float32Array([resolution.x, resolution.y]),
    );

    this.setUniform(
      'u_gradientTexture',
      createTextureFromImage(gl, gradientTexture),
    );

    this.setUniform('u_center', new Float32Array([center.x, center.y]));

    this.gradientTexture = gradientTexture;
  }
}
