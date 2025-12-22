import { Vector2 } from '../../math/index.js';
import { createTextureFromImage } from '../shaders/index.js';
import { Material } from './material.js';

export class GradientMaterial extends Material {
  public readonly gradientTexture: HTMLImageElement;

  constructor(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
    resolution: Vector2,
    gradientTexture: HTMLImageElement,
    center: Vector2 = new Vector2(0.5, 0.5),
  ) {
    super(vertexShaderSource, fragmentShaderSource, gl);

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
