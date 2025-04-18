import type { Time } from '../../common';
import type { Vector2 } from '../../math';
import {
  perlinNoiseFragmentShader,
  perlinNoiseShaderInclude,
  quinticShaderInclude,
  randomGradientShaderInclude,
  spriteVertexShader,
} from '../shaders';
import { Material } from './material';

export class PerlinNoiseMaterial extends Material {
  private readonly _time: Time;

  constructor(gl: WebGL2RenderingContext, resolution: Vector2, time: Time) {
    super(gl, spriteVertexShader, perlinNoiseFragmentShader, {
      randomGradient: randomGradientShaderInclude,
      quintic: quinticShaderInclude,
      perlinNoise: perlinNoiseShaderInclude,
    });

    this.setUniform(
      'u_resolution',
      new Float32Array([resolution.x, resolution.y]),
    );

    this.setUniform('u_time', time.time);

    this._time = time;
  }

  protected override beforeBind(): void {
    this.setUniform('u_time', this._time.time / 1000);
  }
}
