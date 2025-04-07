import type { Time } from '../../common';
import type { Vector2 } from '../../math';
import {
  colorPerlinNoise,
  createTextureFromImage,
  perlinNoiseShaderInclude,
  quinticShaderInclude,
  randomGradientShaderInclude,
  spriteVertexShader,
} from '../shaders';
import { Material } from './material';

export class DemoMaterial extends Material {
  private readonly _time: Time;

  constructor(
    gl: WebGL2RenderingContext,
    resolution: Vector2,
    texture: HTMLImageElement,
    time: Time,
  ) {
    super(gl, spriteVertexShader, colorPerlinNoise, {
      perlinNoise: perlinNoiseShaderInclude,
      randomGradient: randomGradientShaderInclude,
      quintic: quinticShaderInclude,
    });

    this.setUniform(
      'u_resolution',
      new Float32Array([resolution.x, resolution.y]),
    );

    this.setUniform('u_texture', createTextureFromImage(gl, texture));

    this._time = time;
  }

  protected override beforeBind(): void {
    this.setUniform('u_time', this._time.time);
  }
}
