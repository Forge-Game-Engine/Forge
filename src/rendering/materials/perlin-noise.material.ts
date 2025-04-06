import type { Time } from '../../common';
import type { Vector2 } from '../../math';
import {
  cubicShaderInclude,
  perlinNoiseFragmentShader,
  quinticShaderInclude,
  randomGradientShaderInclude,
  sdfCircleShaderInclude,
  sdfOrientedBoxShaderInclude,
  spriteVertexShader,
} from '../shaders';
import { Material } from './material';

export class PerlinNoiseMaterial extends Material {
  constructor(gl: WebGL2RenderingContext, resolution: Vector2, time: Time) {
    super(gl, spriteVertexShader, perlinNoiseFragmentShader, {
      randomGradient: randomGradientShaderInclude,
      sdfCircle: sdfCircleShaderInclude,
      sdfOrientedBox: sdfOrientedBoxShaderInclude,
      cubic: cubicShaderInclude,
      quintic: quinticShaderInclude,
    });

    this.setUniform(
      'u_resolution',
      new Float32Array([resolution.x, resolution.y]),
    );

    this.setUniform('u_time', time.time);
  }
}
